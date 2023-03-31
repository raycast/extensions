import React, { useState } from "react";
import { copyToClipboard, getShiftGroups } from "../helpers/shifts";
import { buildDockerCommand } from "../helpers/command";
import { Action, ActionPanel, Form, getPreferenceValues, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { Command, Group, Preferences, Shift } from "../types/shifts";
import { homedir } from "os";
import { FormValues } from "../types/shifts";

export function GenerateCommandForm(): JSX.Element {
  const [shiftCode, setShiftCode] = useState<string>("10");
  const [projectPath, setProjectPath] = useState<string>("${PWD}");
  const [shiftCommand, setShiftCommand] = useState<string>("");

  function handleSubmit(values: FormValues) {
    const preferences = getPreferenceValues<Preferences>();

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
          <Action.SubmitForm title="Generate Shift Command" onSubmit={handleSubmit} />
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
          <Form.DropdownSection key={group.name} title={group.name}>
            {group.shifts.map((code: Shift) => (
              <Form.Dropdown.Item key={code.code} value={code.code} title={`[${code.name}] - ${code.description}`} />
            ))}
          </Form.DropdownSection>
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

      <Form.Separator />

      <Form.Description text="To change the Docker Token or Git author, head over to Extensions -> Laravel Shift." />
    </Form>
  );
}
