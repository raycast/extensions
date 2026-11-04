import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { AutomationPermissionText, DEFAULT_ERROR_TITLE } from "../../constants";

const AUTOMATION_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation";

export function AutomationPermissionError() {
  showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, "Allow Raycast to control Google Chrome in System Settings");

  return (
    <Detail
      markdown={AutomationPermissionText}
      actions={
        <ActionPanel>
          <Action.Open title="Open Automation Settings" target={AUTOMATION_SETTINGS_URL} />
        </ActionPanel>
      }
    />
  );
}
