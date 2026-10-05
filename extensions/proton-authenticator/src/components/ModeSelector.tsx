import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { ImportMode } from "../types";

interface ModeSelectorProps {
  onModeSelected: (mode: ImportMode) => void;
}

export default function ModeSelector({ onModeSelected }: ModeSelectorProps) {
  return (
    <List navigationTitle="Choose Import Method">
      <List.Section title="How would you like the extension to read your TOTP accounts?">
        <List.Item
          icon={Icon.HardDrive}
          title="Local Database (Recommended)"
          subtitle="Read directly from Proton Authenticator database"
          accessories={[{ text: "Auto sync" }]}
          actions={
            <ActionPanel>
              <Action title="Select Local Database" icon={Icon.HardDrive} onAction={() => onModeSelected("sqlite")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Document}
          title="JSON Export File"
          subtitle="Import from exported JSON file"
          accessories={[{ text: "Manual sync" }]}
          actions={
            <ActionPanel>
              <Action title="Select JSON Import" icon={Icon.Document} onAction={() => onModeSelected("json")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
