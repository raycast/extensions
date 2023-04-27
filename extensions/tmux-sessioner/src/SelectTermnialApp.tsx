import { Action, ActionPanel, Application, Form, getApplications } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

import { useEffect, useState } from "react";
import { applicationIconFromPath } from "./pathUtils";

const ALLOWED_APPS = ["kitty", "Alacritty", "iTerm2", "Terminal", "Warp"];

export const SelectTerminalApp = ({ setTerminalAppName }: { setTerminalAppName: (value: string) => void }) => {
  const [apps, setApps] = useState<Application[]>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const apps = (await getApplications()).filter((app) => ALLOWED_APPS.includes(app.name));

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
      <Form.Description text="Choose your default terminal App" />
      <Form.Description text="When switch to session, it will open the session in the selected terminal app." />
      <Form.Dropdown id="terminalAppName" isLoading={loading}>
        {apps?.map((app, index) => (
          <Form.Dropdown.Item key={index} value={app.name} title={app.name} icon={applicationIconFromPath(app.path)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
