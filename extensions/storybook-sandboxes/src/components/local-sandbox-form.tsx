import { Action, ActionPanel, Detail, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { Sandbox, SandboxKey } from "../utils/sandboxes";
import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { useEffect, useState } from "react";
import { useDefaultEditor, useTerminals } from "../utils/hooks";
import { LocalSandboxCreation } from "./local-sandbox-creation";

type Props = {
  sandboxKey: SandboxKey;
  sandbox: Sandbox;
};

export const LocalSandboxForm = ({ sandbox, sandboxKey }: Props) => {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const defaultParentDirectory = preferences.defaultDirectory ?? homedir();
  const [directory, setDirectory] = useState<string>(`${defaultParentDirectory}/${sandboxKey.replaceAll("/", "-")}`);
  const [directoryError, setDirectoryError] = useState<string | undefined>();

  useEffect(() => {
    console.dir({
      directory,
      preferences,
    });
  }, [directory, preferences]);
  useEffect(() => {
    console.dir({
      "process.env.PATH": process.env.PATH,
      "process.env.NODE_PATH": process.env.NODE_PATH,
      "process.env.HOME": process.env.HOME,
      "os.homedir()": homedir(),
    });
  }, []);

  return (
    <Form
      navigationTitle="Create Local Storybook Sandbox"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Local Sandbox"
            icon={Icon.HardDrive}
            onSubmit={({ directory }) => {
              const sanitizedDirectory = directory.replace("~", homedir());
              push(<LocalSandboxCreation sandboxKey={sandboxKey} sandbox={sandbox} directory={sanitizedDirectory} />);
            }}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Sandbox" text={sandbox.name} />
      <Form.TextField
        id="directory"
        title="Directory"
        placeholder={`${homedir()}/Desktop/`}
        value={directory}
        onChange={(input) => {
          let newDirectory = input;
          let error;
          // convert ~ to the user's home directory, as ~ is not supported by the sandbox CLI
          if (newDirectory === "~") {
            newDirectory = `${homedir()}/`;
          } else if (newDirectory.startsWith("~")) {
            newDirectory = newDirectory.replace("~", homedir());
          }

          if (newDirectory.length === 0) {
            error = "Directory is required";
          } else if (!newDirectory.startsWith("/")) {
            error = "Path must be absolute";
          } else if (newDirectory === homedir()) {
            error = "Cannot use home directory";
          }

          setDirectory(newDirectory);
          setDirectoryError(error);
        }}
        error={directoryError}
        info="Tip: set a default directory in the Extension's preferences - CMD + SHIFT + P"
        autoFocus
      />
    </Form>
  );
};
