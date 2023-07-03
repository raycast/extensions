import { Action, ActionPanel, Application, Form, Toast, getApplications, showToast, useNavigation } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

import { useEffect, useState } from "react";
import { applicationIconFromPath } from "./utils/pathUtils";

const ALLOWED_APPS = ["kitty", "Alacritty", "iTerm2", "Terminal", "Warp", "WezTerm"];

export const SelectTerminalApp = ({ setIsTerminalSetup }: { setIsTerminalSetup?: (value: boolean) => void }) => {
  const [apps, setApps] = useState<Application[]>();
  const [loading, setLoading] = useState(true);
  const { pop } = useNavigation();

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
      isLoading={loading}
      navigationTitle="Select Terminal App"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Terminal App Name"
            onSubmit={async (values) => {
              LocalStorage.setItem("terminalAppName", values.terminalAppName);
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Setup Terminal",
              });

              toast.style = Toast.Style.Success;
              toast.message = `Terminal ${values.terminalAppName} is setup successfully for tmux sessioner`;

              setIsTerminalSetup && setIsTerminalSetup(true);
              pop();
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
