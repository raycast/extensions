import { Action, ActionPanel, Detail, Icon, Keyboard, open } from "@raycast/api";
import type { CatalogResult } from "../types";

interface SetupViewProps {
  catalog: CatalogResult;
  onRetry: () => void | Promise<void>;
  onStartOver: () => void | Promise<void>;
}

function getDiagnosis(catalog: CatalogResult): { title: string; detail: string } {
  if (catalog.status === "parse-error") {
    return {
      title: "Invalid configuration",
      detail:
        "`providers.yaml` contains invalid YAML. Fix it manually and press Retry, or start over with an empty configuration.",
    };
  }
  return {
    title: "Cannot read configuration",
    detail:
      "`providers.yaml` could not be read. Check file permissions and press Retry, or start over with an empty configuration.",
  };
}

export function SetupView({ catalog, onRetry, onStartOver }: SetupViewProps) {
  const configPath = catalog.path;
  const diagnosis = getDiagnosis(catalog);
  const rawMessage = "message" in catalog && catalog.message ? catalog.message : undefined;
  const errorSection = rawMessage
    ? `\n\n**Error details**\n\n${rawMessage
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}`
    : "";

  const markdown = `# ${diagnosis.title}\n\n${diagnosis.detail}${errorSection}\n\n**Config file**\n\n\`${configPath}\``;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Start over with Empty Config" icon={Icon.Plus} onAction={() => void onStartOver()} />
          <Action
            title="Open Config File"
            icon={Icon.Document}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => void open(configPath).catch(() => undefined)}
          />
          <Action.CopyToClipboard title="Copy Config Path" content={configPath} />
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => void onRetry()}
          />
        </ActionPanel>
      }
    />
  );
}
