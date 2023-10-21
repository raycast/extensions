import { XcodeSimulator } from "../../models/xcode-simulator/xcode-simulator.model";
import { Action, ActionPanel, Clipboard, Form } from "@raycast/api";
import { useState } from "react";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

export function XcodeSimulatorRenameForm(props: { simulator: XcodeSimulator; onRename: () => void }): JSX.Element {
  const [name, setName] = useState<string>(props.simulator.name);
  const [nameError, setNameError] = useState<string | undefined>();

  function validateName(value: string): boolean {
    return value.trim().length > 0;
  }

  function onNameChange(value: string) {
    const isNameValid = validateName(value);
    setNameError(isNameValid ? undefined : "Name cannot be empty");
    setName(value);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={() =>
              operationWithUserFeedback(
                "Renaming Simulator",
                "Simulator Renamed successfully",
                "An error occurred while trying rename the simulator",
                () => XcodeSimulatorService.rename(props.simulator, name)
              ).then(props.onRename)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="New Name"
        placeholder="iPhone 15 ProMax - Personal"
        value={name}
        onChange={onNameChange}
        info="The new Simulator name."
        error={nameError}
      />
    </Form>
  );
}
