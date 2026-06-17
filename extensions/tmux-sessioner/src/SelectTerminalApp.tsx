import { Action, ActionPanel, Application, Form, Toast, getApplications, showToast, useNavigation } from "@raycast/api";
import { LocalStorage } from "@raycast/api";

import { useEffect, useState } from "react";

const ALLOWED_APPS_BUNDLEID = [
  "net.kovidgoyal.kitty",
  "org.alacritty",
  "com.mitchellh.ghostty",
  "com.googlecode.iterm2",
  "com.apple.Terminal",
  "dev.warp.Warp-Stable",
  "com.github.wez.wezterm",
];

export const SelectTerminalApp = ({ setIsTerminalSetup }: { setIsTerminalSetup?: (value: boolean) => void }) => {
  const [apps, setApps] = useState<Application[]>();
  const [loading, setLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const apps = (await getApplications()).filter((app) => ALLOWED_APPS_BUNDLEID.includes(app.bundleId || ""));

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
              LocalStorage.setItem("terminalAppBundleId", values.terminalAppBundleId);
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Setup Terminal",
              });

              toast.style = Toast.Style.Success;
              toast.message = `Terminal ${values.terminalAppBundleId} is setup successfully for tmux sessioner`;

              setIsTerminalSetup && setIsTerminalSetup(true);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose your default terminal App" />
      <Form.Description text="When switch to session, it will open the session in the selected terminal app." />
      <Form.Dropdown id="terminalAppBundleId" isLoading={loading}>
        {apps?.map((app, index) => (
          <Form.Dropdown.Item key={index} value={app.bundleId || ""} title={app.name} icon={{ fileIcon: app.path }} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
