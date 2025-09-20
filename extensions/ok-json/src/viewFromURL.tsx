import { Form, Action, ActionPanel, Clipboard, popToRoot } from "@raycast/api";
import checkForInstallation from "./utilities/checkForInstallation";
import { viewFromURLScript } from "./utilities/jsa";
import { useEffect, useState } from "react";

interface CommandValues {
  command: string;
}

export default function viewFromURL() {
  const [command, setCommand] = useState<string>("");
  const [commandError, setCommandError] = useState<string | undefined>();
  const errorMessage = "Please provide the URL.";

  function dropCommandErrorIfNeeded(value: string) {
    const string = value;
    setCommandError(undefined);
    setCommand(string);
  }

  useEffect(() => {
    checkForInstallation().then((isInstalled) => {
      if (isInstalled) {
        Clipboard.readText().then((res) => {
          if (res && (res.startsWith("https://") || res.startsWith("http://"))) {
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
              if (command && (command.startsWith("https://") || command.startsWith("http://"))) {
                viewFromURLScript(command);
                popToRoot();
              } else {
                if (command) {
                  setCommandError("Should starts with “http” or “https”.");
                } else {
                  setCommandError(errorMessage);
                }
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="command"
        value={command}
        error={commandError}
        onChange={dropCommandErrorIfNeeded}
        title="URL"
        placeholder="View URL Response in OK JSON"
      />
    </Form>
  );
}
