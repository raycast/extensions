import { useState } from "react";
import { copyToClipboard, getShiftGroups } from "../helpers/shifts";
import { buildDockerCommand } from "../helpers/command";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { Command, Group, Preferences, Shift } from "../types/shifts";
import { homedir } from "os";
import { FormValues } from "../types/shifts";

export function GenerateCommandForm(): JSX.Element {
  const [shiftCode, setShiftCode] = useState<string>("10");
  const [projectPath, setProjectPath] = useState<string>("${PWD}");
  const [shiftCommand, setShiftCommand] = useState<string>("");
  const preferences = getPreferenceValues<Preferences>();

  function handleSubmit(values: FormValues) {
    buildDockerCommand(values).then(function (command: Command) {
      setShiftCommand(command);
      copyToClipboard(command).then(function () {
        if (preferences.closeAfterCopy) {
          return showHUD("Shift Command copied to clipboard");
        }
        showToast(Toast.Style.Success, "Command copied to clipboard");
      });
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Shift Command" icon={Icon.Wand} onSubmit={handleSubmit} />
          <Action
            title="Open Preferences"
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            icon={Icon.Gear}
            onAction={() => openExtensionPreferences()}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Generate the Docker command to run a Shift on your project." />

      <Form.Dropdown
        id="shiftCode"
        title="Shift Code"
        info="The Shift you wish to run."
        value={shiftCode}
        onChange={setShiftCode}
      >
        {getShiftGroups().map((group: Group) => (
          <Form.Dropdown.Section key={group.name} title={group.name}>
            {group.shifts.map((code: Shift) => (
              <Form.Dropdown.Item key={code.code} value={code.code} title={`[${code.name}] - ${code.description}`} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="projectPath"
        title="Full project path"
        value={projectPath}
        placeholder={`${homedir()}/your/project`}
        info="The full path to the project you wish to run the Shift on. You can get the full path by running `pwd` in your terminal."
        onChange={setProjectPath}
      />

      {!preferences.closeAfterCopy && (
        <Form.TextArea
          id="shiftCommand"
          title="Shift Command"
          value={shiftCommand}
          placeholder="Shift command will appear here"
          info="The generated Shift Command."
          onChange={setShiftCommand}
          onFocus={() => {
            copyToClipboard(shiftCommand).then(() => showToast(Toast.Style.Success, "Command copied to clipboard"));
          }}
        />
      )}

      <Form.Separator />

      <Form.Description text="Press ⌘+⇧+, to change settings" />
    </Form>
  );
}
