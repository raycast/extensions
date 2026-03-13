import { Icon, List, getPreferenceValues, ActionPanel, Application, Action } from "@raycast/api";

interface AppPickerPreferences {
  openWithRequired: Application;
  openWithOptional?: Application;
}

export default function AppPicker() {
  const preferenceValues: AppPickerPreferences = getPreferenceValues();
  const { openWithRequired, openWithOptional } = preferenceValues;

  return (
    <List>
      <List.Item
        title="Open https://raycast.com"
        actions={
          <ActionPanel>
            <Action.Open
              target="https://raycast.com"
              title={`Open In "${openWithRequired.path}"`}
              icon={Icon.Globe}
              application={openWithRequired}
            />

            {openWithOptional && (
              <Action.Open
                target="https://raycast.com"
                title={`Open In "${openWithOptional.path}"`}
                icon={Icon.Globe}
                application={openWithOptional}
              />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
