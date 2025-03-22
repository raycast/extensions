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
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { Command, Group, Preferences, Shift } from "../types/shifts";
import { homedir } from "os";
import { FormValues } from "../types/shifts";

export function GenerateCommandForm(): JSX.Element {
  const [shiftCode, setShiftCode] = useState<string>("11");
  const [projectPath, setProjectPath] = useState<string>("${PWD}");
  const [shiftCommand, setShiftCommand] = useState<string>("");
  const preferences = getPreferenceValues<Preferences>();

  !shiftCommand && updateShiftCommand({ shiftCode, projectPath });

  function copyShiftCommand(values: FormValues) {
    copyToClipboard(shiftCommand).then(function () {
      if (preferences.closeAfterCopy) {
        return showHUD("Shift Command copied to clipboard");
      }
      showToast(Toast.Style.Success, "Command copied to clipboard");
    });
  }

  function updateShiftCommand(values: FormValues) {
    buildDockerCommand(values).then((shiftCommand: Command) => {
      setShiftCommand(shiftCommand);
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Shift Command" icon={Icon.Wand} onSubmit={copyShiftCommand} />
          <Action
            title="Open Preferences"
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            icon={Icon.Gear}
            onAction={() => {
              openExtensionPreferences();
              popToRoot();
            }}
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
        onChange={(shiftCode: string) => {
          setShiftCode(shiftCode);
          updateShiftCommand({ shiftCode, projectPath });
        }}
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
        onChange={(projectPath: string) => {
          setProjectPath(projectPath);
          updateShiftCommand({ shiftCode, projectPath });
        }}
      />

      <Form.TextArea
        id="shiftCommand"
        title="Shift Command"
        value={shiftCommand}
        placeholder="Shift command will appear here"
        onChange={(shiftCommand: string) => {
          setShiftCommand(shiftCommand);
        }}
        info="The generated Shift Command."
      />

      <Form.Separator />

      <Form.Description text="Press ⌘+⇧+, to change settings" />
    </Form>
  );
}
