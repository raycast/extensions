import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  CliError,
  findCli,
  inspectSetup,
  type SetupDoctor,
  setupPhase,
  syncAndWait,
} from "./cli";
import { literalMarkdown } from "./task-display";

const installCommand = "brew install planetaryescape/ms-todo/ms-todo";
const loginCommand = "ms-todo auth login";
const syncCommand = "ms-todo sync --wait";

type SetupState =
  | { path: string; phase: "checking" | "syncing" | "ready" }
  | { path: string; phase: "install"; message: string }
  | { path: string; phase: "sign-in" }
  | { path: string; phase: "sync"; message?: string }
  | { path: string; phase: "error"; message: string };

function stateFromDoctor(path: string, doctor: SetupDoctor): SetupState {
  const phase = setupPhase(doctor);
  if (phase === "unavailable") {
    return {
      path,
      phase: "error",
      message:
        doctor.daemon.problem ??
        "The local ms-todo daemon has not reported its cache yet. Retry the setup check.",
    };
  }
  if (phase === "sync") {
    if (doctor.syncing === true) return { path, phase: "syncing" };
    const message = doctor.scopes.find((scope) => scope.last_error)?.last_error
      ?.message;
    return message ? { path, phase, message } : { path, phase };
  }
  return { path, phase };
}

export function CliSetup({ children }: { children: ReactNode }) {
  const cliPath = getPreferenceValues<Preferences>().cliPath ?? "";
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<SetupState>({
    path: cliPath,
    phase: "checking",
  });
  const operation = useRef(0);
  const mounted = useRef(true);
  const syncInProgress = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const current = ++operation.current;
    let cancelled = false;
    const currentOperation = () => !cancelled && operation.current === current;
    setState({ path: cliPath, phase: "checking" });

    void (async () => {
      let path: string;
      try {
        path = findCli(cliPath);
      } catch (error) {
        if (currentOperation()) {
          setState({
            path: cliPath,
            phase: "install",
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      try {
        const doctor = await inspectSetup(path);
        if (!currentOperation()) return;
        setState(stateFromDoctor(cliPath, doctor));
      } catch (error) {
        if (!currentOperation()) return;
        setState({
          path: cliPath,
          phase: "error",
          message: error instanceof CliError ? error.message : String(error),
        });
      }
    })();

    return () => {
      cancelled = true;
      mounted.current = false;
      operation.current += 1;
    };
  }, [cliPath, revision]);

  const ready = state.path === cliPath && state.phase === "ready";

  async function startSync() {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    const current = ++operation.current;
    setState({ path: cliPath, phase: "syncing" });
    try {
      await syncAndWait(findCli(cliPath));
      if (!mounted.current || operation.current !== current) return;
      const doctor = await inspectSetup(findCli(cliPath));
      if (!mounted.current || operation.current !== current) return;
      setState(stateFromDoctor(cliPath, doctor));
    } catch (error) {
      if (!mounted.current || operation.current !== current) return;
      setState({
        path: cliPath,
        phase: "sync",
        message: error instanceof CliError ? error.message : String(error),
      });
    } finally {
      syncInProgress.current = false;
      if (mounted.current && operation.current !== current) {
        setRevision((value) => value + 1);
      }
    }
  }

  if (ready) return <>{children}</>;

  const visible =
    state.path === cliPath
      ? state
      : { path: cliPath, phase: "checking" as const };
  const retryAction = (
    <Action
      title="Retry Setup Check"
      icon={Icon.ArrowClockwise}
      onAction={() => {
        setRevision((value) => value + 1);
      }}
    />
  );
  const markdown = (() => {
    switch (visible.phase) {
      case "checking":
        return "# Checking ms-todo setup\n\nChecking the local CLI and cached sync status…";
      case "ready":
        return "";
      case "syncing":
        return "# Syncing your tasks\n\nThe initial sync is running. When it finishes, choose **Retry Setup Check** to open Raycast.";
      case "install":
        return `# Install ms-todo\n\n${literalMarkdown(visible.message)}\n\nInstall the CLI with Homebrew:\n\n\`\`\`sh\n${installCommand}\n\`\`\`\n\nIf it is already installed, set **ms-todo CLI Path** in extension preferences to its absolute executable path, then retry.`;
      case "sign-in":
        return `# Sign in to ms-todo\n\nSign in from Terminal. The CLI completes Microsoft authentication and keeps credentials on this Mac.\n\n\`\`\`sh\n${loginCommand}\n\`\`\`\n\nAfter sign-in, retry setup to check the cache and start the initial sync if needed.`;
      case "sync":
        return `# Sync your tasks\n\n${visible.message ? `${literalMarkdown(visible.message)}\n\n` : "The local task cache has not completed its first sync.\n\n"}Start the initial sync; Raycast will open when the cache is ready.`;
      case "error":
        return `# Could not check ms-todo setup\n\n${literalMarkdown(visible.message)}\n\nCheck the CLI and daemon, then retry.`;
    }
  })();

  return (
    <Detail
      isLoading={visible.phase === "checking" || visible.phase === "syncing"}
      markdown={markdown}
      actions={
        <ActionPanel>
          {visible.phase === "sync" ? (
            <Action
              title="Start Initial Sync"
              icon={Icon.ArrowClockwise}
              onAction={() => void startSync()}
            />
          ) : null}
          {visible.phase !== "checking" &&
          (visible.phase !== "syncing" || !syncInProgress.current)
            ? retryAction
            : null}
          {visible.phase === "install" ? (
            <Action.CopyToClipboard
              title="Copy Homebrew Install Command"
              content={installCommand}
            />
          ) : null}
          {visible.phase === "sign-in" ? (
            <Action.CopyToClipboard
              title="Copy Sign in Command"
              content={loginCommand}
            />
          ) : null}
          {visible.phase === "sync" ? (
            <Action.CopyToClipboard
              title="Copy Sync Command"
              content={syncCommand}
            />
          ) : null}
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    />
  );
}
