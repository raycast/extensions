import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { run } from "./ecosystems";
import { mapWithLimit, withTimeout } from "./utils";

// Per-diagnostic timeout in ms — prevents brew doctor / gem check from hanging
const DIAGNOSTIC_TIMEOUT_MS = 30_000;

type DiagnosticStatus = "success" | "warning" | "error" | "loading";

interface Diagnostic {
  id: string;
  name: string;
  command: string;
  status: DiagnosticStatus;
  output: string;
  fixCommand?: string;
}

const INITIAL_DIAGNOSTICS: Diagnostic[] = [
  {
    id: "brew",
    name: "Homebrew Health (brew doctor)",
    command: "brew doctor 2>&1 | head -n 60 || true",
    status: "loading",
    output: "Running diagnostics…",
  },
  {
    id: "npm",
    name: "NPM Cache (npm cache verify)",
    command: "npm cache verify 2>&1 || true",
    status: "loading",
    output: "Verifying global cache integrity…",
    fixCommand: "npm cache clean --force",
  },
  {
    id: "pip",
    name: "Python PIP (pip check)",
    command:
      "pip check 2>&1 || pip3 check 2>&1 || python3 -m pip check 2>&1 || true",
    status: "loading",
    output: "Checking Python dependency tree…",
  },
  {
    id: "gem",
    name: "Ruby Gems Environment",
    // gem check can take many minutes; use gem environment instead
    command: "gem environment 2>&1 | head -n 30 || true",
    status: "loading",
    output: "Checking Ruby environment…",
  },
  {
    id: "disk",
    name: "Disk Space (Developer Directories)",
    command:
      "df -h / 2>&1; echo '---'; du -sh ~/Library/Caches 2>/dev/null | head -n 1 || true",
    status: "loading",
    output: "Checking disk space…",
  },
  {
    id: "rustup",
    name: "Rust Toolchain (rustup check)",
    command: "rustup check 2>&1 || true",
    status: "loading",
    output: "Checking Rust toolchain updates…",
    fixCommand: "rustup update",
  },
];

export default function Command() {
  const [diagnostics, setDiagnostics] =
    useState<Diagnostic[]>(INITIAL_DIAGNOSTICS);

  useEffect(() => {
    let active = true;

    const runDiagnostics = async () => {
      // Run diagnostics in parallel with a concurrency limit to prevent OOM
      // Each diagnostic has a hard timeout so nothing hangs the UI
      await mapWithLimit(
        INITIAL_DIAGNOSTICS,
        async (diag) => {
          if (!active) return;

          try {
            const output = await withTimeout(
              run(diag.command),
              DIAGNOSTIC_TIMEOUT_MS,
              diag.name,
            );
            const hasWarning = output.toLowerCase().includes("warning");

            if (!active) return;
            setDiagnostics((prev) =>
              prev.map((d) =>
                d.id === diag.id
                  ? {
                      ...d,
                      status: hasWarning ? "warning" : "success",
                      output: output.trim() || "System Healthy ✔️",
                    }
                  : d,
              ),
            );
          } catch (error: any) {
            if (!active) return;
            const msg = error?.message || String(error);
            const isTimeout = msg.includes("timed out");
            setDiagnostics((prev) =>
              prev.map((d) =>
                d.id === diag.id
                  ? {
                      ...d,
                      status: isTimeout ? "warning" : "error",
                      output: isTimeout
                        ? `Timed out after ${DIAGNOSTIC_TIMEOUT_MS / 1000}s. The command may still be running in the background.`
                        : msg,
                    }
                  : d,
              ),
            );
          }
        },
        2, // run max 2 diagnostics concurrently
      );
    };

    void runDiagnostics();
    return () => {
      active = false;
    };
  }, []);

  return (
    <List
      navigationTitle="System Diagnostics"
      searchBarPlaceholder="Filter reports..."
    >
      {diagnostics.map((diag) => {
        let icon = {
          source: Icon.RotateClockwise,
          tintColor: Color.SecondaryText,
        };
        if (diag.status === "success")
          icon = { source: Icon.CheckCircle, tintColor: Color.Green };
        if (diag.status === "warning")
          icon = { source: Icon.Warning, tintColor: Color.Yellow };
        if (diag.status === "error")
          icon = { source: Icon.XMarkCircle, tintColor: Color.Red };

        return (
          <List.Item
            key={diag.id}
            title={diag.name}
            subtitle={
              diag.status === "loading"
                ? "Analyzing..."
                : `${diag.output.substring(0, 50)}...`
            }
            icon={icon}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Full Report"
                  icon={Icon.Eye}
                  target={
                    <Detail
                      markdown={`# 🏥 ${diag.name} Report\n\n\`\`\`\n${diag.output}\n\`\`\``}
                    />
                  }
                />
                {diag.fixCommand && diag.status !== "success" && (
                  <Action
                    title="Run Auto-fix"
                    icon={Icon.Wand}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Running fix...",
                      });
                      try {
                        await run(diag.fixCommand!);
                        toast.style = Toast.Style.Success;
                        toast.title = "Fix Applied";
                      } catch (err: any) {
                        toast.style = Toast.Style.Failure;
                        ((toast.title = "Fix Failed"),
                          (toast.message = err.message));
                      }
                    }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Report"
                  content={diag.output}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
