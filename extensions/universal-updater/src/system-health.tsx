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
    command: "brew doctor",
    status: "loading",
    output: "Running diagnostics...",
  },
  {
    id: "npm",
    name: "NPM Cache (npm cache verify)",
    command: "npm cache verify",
    status: "loading",
    output: "Verifying global cache integrity...",
    fixCommand: "npm cache clean --force",
  },
  {
    id: "pip",
    name: "Python PIP (pip check)",
    command: "pip check",
    status: "loading",
    output: "Checking Python dependency tree...",
  },
  {
    id: "gem",
    name: "Ruby Gems (gem check)",
    command: "gem check",
    status: "loading",
    output: "Verifying installed gems...",
  },
];

export default function Command() {
  const [diagnostics, setDiagnostics] =
    useState<Diagnostic[]>(INITIAL_DIAGNOSTICS);

  useEffect(() => {
    let active = true;

    const runDiagnostics = async () => {
      for (const diag of INITIAL_DIAGNOSTICS) {
        if (!active) break;

        try {
          const output = await run(diag.command);
          const hasWarning = output.toLowerCase().includes("warning");

          setDiagnostics((prev) =>
            prev.map((d) =>
              d.id === diag.id
                ? {
                    ...d,
                    status: hasWarning ? "warning" : "success",
                    output: output.trim() || "System Healthy",
                  }
                : d,
            ),
          );
        } catch (error: any) {
          if (!active) break;
          setDiagnostics((prev) =>
            prev.map((d) =>
              d.id === diag.id
                ? {
                    ...d,
                    status: "error",
                    output: error.message || String(error),
                  }
                : d,
            ),
          );
        }
      }
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
