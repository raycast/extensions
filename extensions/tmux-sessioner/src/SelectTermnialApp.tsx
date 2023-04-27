import { Action, ActionPanel, Form } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

import { runAppleScript } from "run-applescript";
import { useEffect, useState } from "react";
import { applicationIconFromPath, applicationNameFromPath } from "./pathUtils";

async function getAllAppPaths(): Promise<string[]> {
  const result = await runAppleScript(`
    set appPaths to {}
    tell application "System Events"
      repeat with aProcess in (get file of every process whose background only is false)
        set processPath to POSIX path of aProcess
        set end of appPaths to processPath
      end repeat
    end tell

    return appPaths
  `);

  return result.split(", ").map((appPath) => appPath.trim());
}

interface App {
  name: string;
  iconPath: string;
}

export const SelectTerminalApp = ({ setTerminalAppName }: { setTerminalAppName: (value: string) => void }) => {
  const [apps, setApps] = useState<App[]>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const appPaths = await getAllAppPaths();
      const appNames = appPaths.map((appPath) => applicationNameFromPath(appPath));
      const appIcons = appPaths.map((appPath) => applicationIconFromPath(appPath));

      const apps = appNames.map((appName, index) => {
        return {
          name: appName,
          iconPath: appIcons[index],
        };
      });

      setApps(apps);
      setLoading(false);
    })();
  }, []);

  return (
    <Form
      enableDrafts
      navigationTitle="Select Terminal App"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Terminal App Name"
            onSubmit={(values) => {
              LocalStorage.setItem("terminalAppName", values.terminalAppName);
              setTerminalAppName(values.terminalAppName);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Select Terminal App"
        text="Choose your default terminal App. When switch to session, it will open the session in the selected terminal app."
      />
      <Form.Dropdown id="terminalAppName" isLoading={loading}>
        {apps?.map((app, index) => (
          <Form.Dropdown.Item key={index} value={app.name} title={app.name} icon={app.iconPath} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
