import { Action, ActionPanel, Clipboard, Detail, Icon, LocalStorage, closeMainWindow, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Aggressiveness, cleanText, getPreferences, resolveInput } from "./trim-core";

const AGGRESSIVENESS_KEY = "preview-trim:aggressiveness";

const AGGRESSIVENESS_LABELS: Record<Aggressiveness, string> = {
  low: "Low (safer)",
  normal: "Normal",
  high: "High (eager)",
};

export default function Command() {
  const { aggressiveness: preferenceDefault, preferSelectionFallback } = getPreferences<Preferences.PreviewTrim>();
  const [aggressiveness, setAggressiveness] = useState<Aggressiveness>(preferenceDefault);

  // Load input once and restore persisted aggressiveness level.
  const { data, error, isLoading } = usePromise(async () => {
    const [input, stored] = await Promise.all([
      resolveInput(preferSelectionFallback),
      LocalStorage.getItem<Aggressiveness>(AGGRESSIVENESS_KEY),
    ]);
    if (stored) setAggressiveness(stored);
    return input;
  });

  const cleaned = data ? cleanText(data.text, aggressiveness) : "";

  const markdown = error
    ? `# Unable to preview Trim\n\n${String(error)}`
    : [
        `# Trim Preview`,
        ``,
        `**Source:** ${data?.source ?? "loading"}`,
        `**Aggressiveness:** ${AGGRESSIVENESS_LABELS[aggressiveness]}`,
        ``,
        `## Original`,
        "```",
        data?.text ?? "",
        "```",
        ``,
        `## Trimmed`,
        "```",
        cleaned,
        "```",
      ].join("\n");

  async function switchAggressiveness(level: Aggressiveness) {
    setAggressiveness(level);
    await LocalStorage.setItem(AGGRESSIVENESS_KEY, level);
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        data ? (
          <ActionPanel>
            <Action
              title="Copy Trimmed Result"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await Clipboard.copy(cleaned);
                await showHUD("Copied trimmed result");
              }}
            />
            <Action
              title="Paste Trimmed Result"
              icon={Icon.ReplaceOne}
              onAction={async () => {
                await closeMainWindow({ clearRootSearch: true });
                await Clipboard.paste(cleaned);
                await showHUD("Pasted trimmed result");
              }}
            />
            <Action.CopyToClipboard
              title="Copy Original Input"
              icon={Icon.Document}
              content={data.text}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <ActionPanel.Section title="Aggressiveness">
              {(["low", "normal", "high"] as Aggressiveness[]).map((level, i) => (
                <Action
                  key={level}
                  title={AGGRESSIVENESS_LABELS[level]}
                  icon={aggressiveness === level ? Icon.CheckCircle : Icon.Circle}
                  shortcut={{ modifiers: ["cmd"], key: String(i + 1) as "1" | "2" | "3" }}
                  onAction={async () => {
                    await switchAggressiveness(level);
                  }}
                />
              ))}
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
