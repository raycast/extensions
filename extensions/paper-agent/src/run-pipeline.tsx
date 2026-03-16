import { Action, ActionPanel, Detail, getPreferenceValues, open, popToRoot, showToast, Toast } from "@raycast/api";
import * as path from "node:path";
import { useEffect, useState } from "react";
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

function RunPipelineView({ prefs }: { prefs: Preferences.RunPipeline }) {
  const [status, setStatus] = useState<"checking" | "core-missing" | "running">("checking");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const run = async () => {
      const core = await checkCoreAvailable({
        configPath: prefs.configPath,
        paperDir: prefs.paperDir,
        pythonPath: prefs.pythonPath,
      });
      if (cancelled) return;
      if (!core.ok) {
        setStatus("core-missing");
        return;
      }

      setStatus("running");
      try {
        const schedulePaths = getSchedulePaths();
        const activePid = getActiveRunLockPid(schedulePaths.stateDir);
        if (activePid !== undefined) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Paper Agent already running",
            message: `Current run PID: ${activePid}`,
          });
          return;
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
          await showToast({
            style: Toast.Style.Failure,
            title: "Paper Agent failed",
            message: stderr ? stderr.slice(0, 200) : undefined,
          });
        }
      } catch (err) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Paper Agent failed",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        if (cleanup) {
          cleanup();
        }
        if (!cancelled) {
          await popToRoot({ clearSearchBar: true });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return <Detail isLoading={true} markdown="Checking Paper Agent core…" navigationTitle="Run Paper Agent" />;
  }

  if (status === "core-missing") {
    const configPath = prefs.configPath?.trim() ?? "";
    const configDir = configPath ? path.dirname(configPath) : "";
    return (
      <Detail
        markdown={coreNotFoundMarkdown}
        navigationTitle="Run Paper Agent"
        actions={
          <ActionPanel>
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
  const prefs = getPreferenceValues<Preferences.RunPipeline>();
  return <RunPipelineView prefs={prefs} />;
}
