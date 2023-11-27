import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { launchApp } from "./adbUtils";


export interface LaunchScreenProps {
  deviceId: string,
  packageName: string
}

const markdown = `
# Launch app

Press 'enter' to launch recently installed app.

Press 'cmd + enter' to launch recently installed app logged in using buypass id in QA01. See extension settings for setting buypass id.
`;

export const LaunchAppScreen = (props: LaunchScreenProps) => {
  const { deviceId, packageName } = props;
  const preferences: Preferences = getPreferenceValues();
  const buypassId = preferences.buypassIdQa01;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Launch" onAction={() => { launchApp(packageName, deviceId, undefined) }} />
          <Action title="Launch Logged In" onAction={() => {
            launchApp(packageName, deviceId, buypassId)
          }
          }
          />
        </ActionPanel>
      }
    />
  )
}