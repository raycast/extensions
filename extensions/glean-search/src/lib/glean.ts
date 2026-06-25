import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { useCallback, useEffect, useRef, useState } from "react";
import { promisify } from "util";
import { clearDownloadError, resolveGleanCli } from "./cli";
import { checkGleanAuth, readGleanConfigServerUrl, signInToGlean } from "./auth";
import type { AuthInfo, GleanResult, GleanSearchResponse } from "./types";

const execFileAsync = promisify(execFile);

export interface GleanState {
  cliPath: string | null;
  isInitializing: boolean;
  auth: AuthInfo | null;
  search: (query: string, signal: AbortSignal) => Promise<GleanResult[]>;
  signIn: (email?: string) => Promise<void>;
  recheckAuth: () => Promise<void>;
  needsEmail: boolean;
  retryCliDiscovery: () => Promise<void>;
}

function buildEnv(): NodeJS.ProcessEnv {
  const preferences = getPreferenceValues<Preferences>();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin", process.env.PATH].filter(Boolean).join(":"),
  };
  const serverUrl = readGleanConfigServerUrl() || preferences.gleanHost;
  if (serverUrl) {
    env.GLEAN_SERVER_URL = serverUrl;
  }
  return env;
}

/**
 * Orchestrate glean CLI discovery, auth checking, and search execution.
 */
export function useGlean(): GleanState {
  const [cliPath, setCliPath] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const cliRef = useRef<string | null>(null);

  // ── CLI discovery + auth (runs once on mount) ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Discover binary
      const preferences = getPreferenceValues<Preferences>();
      const path = await resolveGleanCli(preferences);
      if (cancelled) return;

      cliRef.current = path;
      setCliPath(path);

      // Check auth in same pass (only if binary was found)
      if (path) {
        const info = await checkGleanAuth(path);
        if (!cancelled) {
          setAuth(info);
        }
      }

      if (!cancelled) setIsInitializing(false);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Determine whether user needs to provide email for instance lookup ──
  useEffect(() => {
    if (auth && auth.state === "unauthenticated") {
      const serverUrl = readGleanConfigServerUrl() || getPreferenceValues<Preferences>().gleanHost;
      setNeedsEmail(!serverUrl);
    } else {
      setNeedsEmail(false);
    }
  }, [auth]);

  // ── Search (stable reference) ─────────────────────────────────────────
  const search = useCallback(async (query: string, signal: AbortSignal): Promise<GleanResult[]> => {
    const path = cliRef.current;
    if (!path) throw new Error("Glean CLI not found");
    if (!query.trim()) return [];

    const env = buildEnv();
    const { stdout } = await execFileAsync(path, ["search", query], {
      env,
      signal,
      encoding: "utf-8",
      timeout: 10000,
    });

    const parsed: GleanSearchResponse = JSON.parse(stdout);
    return parsed.results ?? [];
  }, []);

  const signIn = useCallback(async (email?: string): Promise<void> => {
    const path = cliRef.current;
    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Glean CLI not found",
        message: "Install via brew or check your preferences",
        primaryAction: {
          title: "Open Downloads",
          onAction: () => open("https://github.com/gleanwork/glean-cli/releases"),
        },
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Signing in to Glean",
      message: "A browser window will open for authentication…",
    });

    const result = await signInToGlean(path, email);

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Signed in successfully";
      toast.message = "You can now search your knowledge base";
      await toast.hide();

      const info = await checkGleanAuth(path);
      setAuth(info);
      // Re-evaluate whether email is still needed after successful auth
      const serverUrl = readGleanConfigServerUrl() || getPreferenceValues<Preferences>().gleanHost;
      setNeedsEmail(!serverUrl);
    } else {
      const isEmailError = result.message.toLowerCase().includes("reading email");
      if (isEmailError && !email) {
        await toast.hide();
        setNeedsEmail(true);
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Sign in failed";
      toast.message = result.message;
    }
  }, []);

  // ── Re-check auth (stable reference) ───────────────────────────────────
  const recheckAuth = useCallback(async (): Promise<void> => {
    const path = cliRef.current;
    if (!path) return;

    const info = await checkGleanAuth(path);
    setAuth(info);
  }, []);

  // ── Retry CLI discovery (trigger auto-download) ────────────────────────
  const retryCliDiscovery = useCallback(async (): Promise<void> => {
    clearDownloadError();
    setIsInitializing(true);
    const preferences = getPreferenceValues<Preferences>();
    const path = await resolveGleanCli(preferences);
    cliRef.current = path;
    setCliPath(path);
    if (path) {
      const info = await checkGleanAuth(path);
      setAuth(info);
    }
    setIsInitializing(false);
  }, []);

  return { cliPath, isInitializing, auth, needsEmail, retryCliDiscovery, search, signIn, recheckAuth };
}
