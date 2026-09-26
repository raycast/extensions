import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  environment,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { AuthError, redirectUriForRegistration, sessionInfo, signIn, signOut } from "./lib/auth";
import { authMode, prefs } from "./lib/preferences";
import { cacheClear } from "./lib/cache";
import { NavigationActions } from "./components/actions";

type Session = Awaited<ReturnType<typeof sessionInfo>>;

export default function SignInCommand() {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const mode = authMode();
  const p = prefs();

  const reload = useCallback(async () => {
    setSession(await sessionInfo());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Only build an authorization request on explicit demand: creating one replaces the PKCE client's
  // pending state, which would break a sign-in that is already open in the browser.
  const copyRedirectUri = async () => {
    try {
      const uri = await redirectUriForRegistration();
      await Clipboard.copy(uri);
      await showToast({ style: Toast.Style.Success, title: "Redirect URI copied", message: uri });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't build redirect URI",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const doSignIn = async () => {
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Opening SnapTrade…" });
    setLastError(null);
    try {
      await signIn();
      cacheClear();
      await reload();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in to SnapTrade";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title =
        e instanceof AuthError && e.reason === "not-configured" ? "Folio isn't configured" : "Sign-in failed";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Signing out…" });
    try {
      const result = await signOut();
      cacheClear();
      await reload();
      if (result.revoked) {
        toast.style = Toast.Style.Success;
        toast.title = "Signed out";
        toast.message = "Session revoked at SnapTrade and tokens removed from Raycast.";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Signed out locally only";
        toast.message = `SnapTrade revoke failed (${result.error ?? "unknown error"}). Tokens were removed from Raycast; the access token expires on its own within 10 hours.`;
      }
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sign-out failed";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy(false);
    }
  };

  const signedIn = Boolean(session);
  const configured =
    Boolean(p.oauthClientId) && /^https:\/\//.test(p.authWorkerUrl) && !p.authWorkerUrl.includes("example.workers.dev");

  const lines: string[] = ["# Sign In with SnapTrade", ""];
  if (mode === "fixtures") {
    lines.push(
      "**Demo mode is on.** Folio is rendering bundled fixture data and won't call SnapTrade.",
      "",
      "Turn off *Use bundled fixture data* in preferences to use your own accounts.",
    );
  } else if (mode === "dev-personal-key") {
    lines.push(
      "**Developer key mode is on.** Requests are HMAC-signed with your SnapTrade Personal API key (clientId + consumerKey). OAuth sign-in is bypassed.",
    );
  } else if (session === undefined) {
    lines.push("Checking session…");
  } else if (signedIn) {
    lines.push(
      `✅ Signed in${session?.email ? ` as **${session.email}**` : ""}.`,
      "",
      "Folio holds a read-only SnapTrade session. It can list accounts, holdings and activities. It cannot trade or move money.",
    );
  } else {
    lines.push(
      "You're signed out.",
      "",
      "Sign in opens SnapTrade in your browser. After you approve read-only access, Raycast receives a one-time code and the Folio auth worker exchanges it for tokens. The OAuth client secret never leaves the worker.",
    );
  }
  if (mode === "oauth" && !signedIn && environment.isDevelopment) {
    lines.push(
      "",
      "> 🛠 Development build: if the overlay stays open after the browser returns, quit and reopen Raycast once. Raycast only routes OAuth callbacks to extensions that were present when it started.",
    );
  }
  if (lastError) {
    lines.push("", `> ❌ Last sign-in attempt failed: ${lastError}`);
  }
  if (mode === "oauth" && !configured) {
    lines.push(
      "",
      "> ⚠️ Set **Auth Worker URL** and **SnapTrade OAuth Client ID** in the extension preferences first.",
    );
  }

  return (
    <Detail
      isLoading={busy || (mode === "oauth" && session === undefined)}
      markdown={lines.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Mode"
            text={
              mode === "fixtures"
                ? "Demo fixtures"
                : mode === "dev-personal-key"
                  ? "Personal API key (dev)"
                  : "OAuth (read-only)"
            }
          />
          <Detail.Metadata.Label
            title="Status"
            text={mode !== "oauth" ? "n/a" : signedIn ? "Signed in" : "Signed out"}
          />
          {session?.scope ? <Detail.Metadata.Label title="Scopes" text={session.scope} /> : null}
          {session?.updatedAt ? (
            <Detail.Metadata.Label title="Token updated" text={session.updatedAt.toLocaleString()} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Auth worker" text={p.authWorkerUrl || "not set"} />
          <Detail.Metadata.Label title="Client ID" text={p.oauthClientId || "not set"} />
          <Detail.Metadata.Label title="Redirect URI" text="https://raycast.com/redirect?packageName=Extension" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {mode === "oauth" && !signedIn && (
            <Action title="Sign In with SnapTrade" icon={Icon.Person} onAction={doSignIn} />
          )}
          {mode === "oauth" && signedIn && (
            <Action title="Sign out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={doSignOut} />
          )}
          {mode === "oauth" && signedIn && <Action title="Sign in Again" icon={Icon.Repeat} onAction={doSignIn} />}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {mode === "oauth" && !busy && (
            <Action
              title="Copy Redirect URI (for OAuth App Registration)"
              icon={Icon.Clipboard}
              onAction={copyRedirectUri}
            />
          )}
          <Action.OpenInBrowser title="Open SnapTrade Dashboard" url="https://dashboard.snaptrade.com" />
          <NavigationActions />
        </ActionPanel>
      }
    />
  );
}
