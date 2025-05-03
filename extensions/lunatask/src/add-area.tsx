import { Toast, showToast, Action, ActionPanel, Form, Icon, LocalStorage, confirmAlert, Alert } from "@raycast/api";
import { useState, useRef } from "react";

export interface Values {
  areaNameField: string;
  areaIDField: string;
}

async function addArea(values: Values, fieldRefs: React.RefObject<Form.ItemReference>[]) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding area...",
  });
  try {
    const areaID = await LocalStorage.getItem(values.areaNameField);

    if (areaID) {
      // Confirm if user wants to update the Area ID
      if (
        await confirmAlert({
          title: `"${values.areaNameField}" area already exists`,
          message: "Do you want to update the Area ID for this area?",
          primaryAction: {
            title: "Update Area ID",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        // Update the Area ID
        await LocalStorage.setItem(values.areaNameField, values.areaIDField);

        toast.style = Toast.Style.Success;
        toast.title = `"${values.areaNameField}" Area ID updated!`;
      } else {
        // Don't update the Area ID
        toast.style = Toast.Style.Failure;
        toast.title = `"${values.areaNameField}" Area ID not updated!`;
      }
    } else {
      // Add the new Area ID
      await LocalStorage.setItem(values.areaNameField, values.areaIDField);

      toast.style = Toast.Style.Success;
      toast.title = `${values.areaNameField} area added!`;
    }

    fieldRefs.forEach((ref) => ref.current?.reset());
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error adding area. Please try again.";
  }
}

export default function Command() {
  const [areaNameError, setAreaNameError] = useState<string | undefined>();
  const [areaIDError, setAreaIDError] = useState<string | undefined>();

  const areaNameFieldRef = useRef<Form.TextField>(null);
  const areaIDFieldRef = useRef<Form.TextArea>(null);

  const fieldRefs = [areaNameFieldRef, areaIDFieldRef];

  function dropAreaNameErrorIfNeeded() {
    if (areaNameError && areaNameError.length > 0) {
      setAreaNameError(undefined);
    }
  }

  function dropAreaIDErrorIfNeeded() {
    if (areaIDError && areaIDError.length > 0) {
      setAreaIDError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Lunatask Area to Raycast"
            onSubmit={(values: Values) => addArea(values, fieldRefs)}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="areaNameField"
        title="Area Name"
        placeholder="Enter your area name (can be anything)."
        error={areaNameError}
        onChange={dropAreaNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setAreaNameError("The field should't be empty!");
          } else {
            dropAreaNameErrorIfNeeded();
          }
        }}
        ref={areaNameFieldRef}
        autoFocus
      />
      <Form.PasswordField
        id="areaIDField"
        title="Area ID"
        placeholder="Enter your Area ID."
        error={areaIDError}
        onChange={dropAreaIDErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setAreaIDError("The field should't be empty!");
          } else {
            dropAreaIDErrorIfNeeded();
          }
        }}
        ref={areaIDFieldRef}
      />
    </Form>
  );
}
