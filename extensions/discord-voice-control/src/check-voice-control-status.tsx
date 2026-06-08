import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { checkVoiceControlStatus } from "./application/check-status";
import type { StatusEvaluation } from "./application/evaluate-status";
import { BEST_EFFORT_NOTE } from "./shared/messages";

const ACCESSIBILITY_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

function checkLine(ok: boolean, okText: string, notOkText: string): string {
  const icon = ok ? "✅" : "⚠️";
  return `- ${icon} ${ok ? okText : notOkText}`;
}

function buildMarkdown(evaluation: StatusEvaluation): string {
  const { checks, result } = evaluation;
  const accessibilityLine = checks.accessibilityGranted
    ? checkLine(true, "Accessibility permission granted", "")
    : checks.accessibilityUnknown
      ? "- ❔ Accessibility permission could not be verified"
      : checkLine(false, "", "Accessibility permission required");

  return [
    `# Discord Voice Control — Status`,
    ``,
    `**${result.message}**`,
    ``,
    `## Readiness`,
    checkLine(checks.discordInstalled, "Discord is installed", "Discord not detected as installed"),
    checkLine(checks.discordRunning, "Discord is running", "Discord is not running"),
    accessibilityLine,
    checkLine(
      checks.shortcutsConfigured,
      "Mute & deafen shortcuts are configured",
      "A shortcut is not configured correctly",
    ),
    ``,
    `## Control mechanism`,
    `- Mechanism: **Shortcut dispatch** (the only mechanism in this MVP).`,
    `- There is **no fallback** and **no state confirmation**.`,
    ``,
    `> ${BEST_EFFORT_NOTE}`,
  ].join("\n");
}

export default function CheckVoiceControlStatusCommand() {
  const [evaluation, setEvaluation] = useState<StatusEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const result = await checkVoiceControlStatus();
    setEvaluation(result);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const tagColor =
    evaluation?.result.outcome === "success"
      ? Color.Green
      : evaluation?.result.outcome === "unknown"
        ? Color.Yellow
        : Color.Red;
  const tagText = evaluation ? evaluation.result.outcome.toUpperCase() : "CHECKING";

  return (
    <Detail
      isLoading={isLoading}
      markdown={evaluation ? buildMarkdown(evaluation) : "Checking voice control readiness…"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Readiness">
            <Detail.Metadata.TagList.Item text={tagText} color={tagColor} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Mechanism" text="Shortcut dispatch" />
          <Detail.Metadata.Label title="Confirmation" text="None (best-effort)" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Recheck Status" icon={Icon.ArrowClockwise} onAction={() => void load()} />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action
            title="Open Accessibility Settings"
            icon={Icon.Lock}
            onAction={() => void open(ACCESSIBILITY_SETTINGS_URL)}
          />
        </ActionPanel>
      }
    />
  );
}
