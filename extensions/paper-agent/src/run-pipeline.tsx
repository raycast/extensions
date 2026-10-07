import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import * as path from "node:path";
import { useEffect, useMemo, useState } from "react";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText } from "./core-check";
import {
  buildRunEnv,
  getActiveRunLockPid,
  getSchedulePaths,
  parseProcessedCount,
  prepareRun,
  runViaRunner,
} from "./run-utils";

function parseSkipMessage(output: string): string | undefined {
  if (output.includes("Skipping run because another Paper Agent process is active.")) {
    return "Another Paper Agent run is already active.";
  }
  if (output.includes("Skipping daily run before")) {
    return "Skipped because the daily schedule has not reached its run hour yet.";
  }
  if (output.includes("Skipping daily run because today's run already succeeded.")) {
    return "Skipped because today's scheduled run already succeeded.";
  }
  return undefined;
}

const coreNotFoundMarkdown = `# Core not found

Install Paper Agent core first, then set **Config File Path** and **Paper Directory** in extension Preferences.

- **Install:** [${CORE_INSTALL_URL}](${CORE_INSTALL_URL})
- Or run the **bootstrap command** (use the Copy action below), then configure Preferences.
`;

function RunPipelineView() {
  const [retry, setRetry] = useState(0);
  const prefs = useMemo(() => getPreferenceValues<Preferences.RunPipeline>(), [retry]);
  const [status, setStatus] = useState<"checking" | "core-missing" | "running" | "failed">("checking");
  const [runError, setRunError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    setStatus("checking");

    const run = async () => {
      const core = await checkCoreAvailable({
        configPath: prefs.configPath,
        paperDir: prefs.paperDir,
        pythonPath: prefs.pythonPath,
      });
      if (cancelled) return;
      if (!core.ok) {
        setRunError(core.error ?? "Check your core installation.");
        setStatus("core-missing");
        return;
      }

      setStatus("running");
      let started = false;
      try {
        const schedulePaths = getSchedulePaths();
        const activePid = getActiveRunLockPid(schedulePaths.stateDir);
        if (activePid !== undefined) {
          throw new Error(
            `Another Paper Agent run is already active (PID ${activePid}). Check Run Status before retrying.`,
          );
        }
        const prepared = prepareRun(prefs, {
          // Detached manual runs must not depend on an auto-cleaned temp config file.
          persistConfigPath: path.join(schedulePaths.stateDir, "manual-run-config.yaml"),
        });
        cleanup = prepared.cleanup;
        const result = await runViaRunner({
          agentRoot: prepared.agentRoot,
          pythonBin: prepared.pythonBin,
          configPath: prepared.configPath,
          env: buildRunEnv(prefs),
          mode: "manual",
          stateDir: schedulePaths.stateDir,
          detach: true,
        });
        if (cancelled) return;
        const { success, stderr, stdout, detached } = result;
        if (success) {
          started = true;
          if (detached) {
            await showToast({
              style: Toast.Style.Success,
              title: "Run started in background",
              message: "Safe to close this window.",
            });
            return;
          }
          const skipMessage = parseSkipMessage([stdout ?? "", stderr ?? ""].join("\n"));
          if (skipMessage) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Paper Agent skipped",
              message: skipMessage,
            });
            return;
          }
          const count = parseProcessedCount(stdout ?? "");
          const message = count !== undefined ? `${count} new paper(s)` : undefined;
          await showToast({ style: Toast.Style.Success, title: "Paper Agent finished", message });
        } else {
          throw new Error(stderr || "Paper Agent could not start.");
        }
      } catch (err) {
        if (!cancelled) {
          setRunError(err instanceof Error ? err.message : String(err));
          setStatus("failed");
        }
      } finally {
        if (cleanup) {
          cleanup();
        }
        if (!cancelled && started) {
          await popToRoot({ clearSearchBar: true });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [prefs]);

  if (status === "checking") {
    return <Detail isLoading={true} markdown="Checking Paper Agent core…" navigationTitle="Run Paper Agent" />;
  }

  if (status === "core-missing" || status === "failed") {
    const configPath = prefs.configPath?.trim() ?? "";
    const configDir = configPath ? path.dirname(configPath) : "";
    return (
      <Detail
        markdown={
          status === "core-missing"
            ? `${coreNotFoundMarkdown}\n\n${runError}`
            : `# Could not start Paper Agent\n\n${runError}`
        }
        navigationTitle="Run Paper Agent"
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action title="Retry" onAction={() => setRetry((value) => value + 1)} />
            <Action.CopyToClipboard title="Copy Bootstrap Command" content={getBootstrapCopyText()} />
            {configDir ? <Action title="Open Config Directory" onAction={() => open(configDir)} /> : null}
            <Action title="Open GitHub" onAction={() => open(CORE_INSTALL_URL)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={true}
      markdown={`Running Paper Agent…

**You can safely close this window** — the run continues in the background.

Recommend **Install Daily Schedule** for automatic daily runs.`}
      navigationTitle="Run Paper Agent"
    />
  );
}

export default function Command() {
  return <RunPipelineView />;
}
