import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { TONE_LABELS } from "./tones";

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: "Clear workplace communication",
  casual: "Conversational and relaxed",
  grammar: "Fix errors, preserve your voice",
  concise: "Remove fluff, keep substance",
  friendly: "Warm and approachable",
  formal: "Polished business language",
};

export default function ChangeTone() {
  const preferences = getPreferenceValues<{ tone: string }>();

  return (
    <List navigationTitle="Change Rewrite Tone">
      {Object.entries(TONE_LABELS).map(([key, label]) => (
        <List.Item
          key={key}
          icon={key === preferences.tone ? Icon.CheckCircle : Icon.Circle}
          title={label}
          subtitle={TONE_DESCRIPTIONS[key] || ""}
          accessories={key === preferences.tone ? [{ tag: "Current" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Set as Default Tone"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
