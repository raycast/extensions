import { Form, Action, ActionPanel, Clipboard, popToRoot } from "@raycast/api";
import checkForInstallation from "./utilities/checkForInstallation";
import { runcURLCommand } from "./utilities/jsa";
import { useEffect, useState } from "react";

interface CommandValues {
  command: string;
}

export default function viewFromcURLCommand() {
  const [command, setCommand] = useState<string>("");
  const [commandError, setCommandError] = useState<string | undefined>();
  const errorMessage = "Please provide the cURL command.";

  function dropCommandErrorIfNeeded(value: string) {
    const string = value;
    setCommandError(undefined);
    setCommand(string);
  }

  useEffect(() => {
    checkForInstallation().then((isInstalled) => {
      if (isInstalled) {
        Clipboard.readText().then((res) => {
          if (res && res.startsWith("curl ")) {
            setCommand(res);
          }
        });
      }
    });
  }, []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: CommandValues) => {
              const command = values.command;
              if (command && command.startsWith("curl ")) {
                runcURLCommand(command);
                popToRoot();
              } else {
                if (command) {
                  setCommandError("cURL command should start with “curl”.");
                } else {
                  setCommandError(errorMessage);
                }
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="command"
        value={command}
        error={commandError}
        onChange={dropCommandErrorIfNeeded}
        title="cURL"
        placeholder="Run cURL command in OK JSON"
      />
    </Form>
  );
}
