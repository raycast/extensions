import { Action, ActionPanel, Detail } from "@raycast/api";
import { OrganizationMode } from "./file-organizer";

interface OrganizationModePickerProps {
  onSelect: (mode: OrganizationMode) => void;
}

export function OrganizationModePicker({ onSelect }: OrganizationModePickerProps) {
  return (
    <Detail
      markdown={`# Choose Organization Mode

**Root Only** organizes files directly inside the selected folder.

**Full Organization** recursively collects nested files while preserving detected software projects.`}
      actions={
        <ActionPanel>
          <Action title="Root Only" onAction={() => onSelect("root")} />
          <Action title="Full Organization" style={Action.Style.Destructive} onAction={() => onSelect("full")} />
        </ActionPanel>
      }
    />
  );
}
