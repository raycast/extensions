import { ActionPanel, Action, Icon, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface TempActionsProps {
  copyValue: string;
  unit: "celsius" | "fahrenheit";
  onToggleUnit: () => void;
}

export function TempActions({ copyValue, unit, onToggleUnit }: TempActionsProps) {
  const targetLabel = unit === "celsius" ? "Fahrenheit" : "Celsius";
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Temperature" content={copyValue} />
      <Action
        title={`Switch to ${targetLabel}`}
        icon={Icon.Switch}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        onAction={async () => {
          onToggleUnit();
          await showToast({ title: `Switched to ${targetLabel}`, style: Toast.Style.Success });
        }}
      />
      <Action
        title="Open Activity Monitor"
        icon={Icon.Gauge}
        onAction={async () => {
          try {
            await runAppleScript('tell application "Activity Monitor" to activate');
            await closeMainWindow();
          } catch {
            await showToast({
              title: "Failed to open Activity Monitor",
              style: Toast.Style.Failure,
            });
          }
        }}
      />
    </ActionPanel>
  );
}
