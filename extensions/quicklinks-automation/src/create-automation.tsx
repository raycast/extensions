import { Action, ActionPanel, Form, Icon, LaunchProps, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AutomationFormValues } from "./types/types";
import { showFailureToast } from "@raycast/utils";

export default function Command(
  props: LaunchProps<{ arguments: AutomationFormValues; draftValues: AutomationFormValues }>,
) {
  const [existingAutomationNames, setExistingAutomationNames] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [descriptionError, setDescriptionError] = useState<string | undefined>(undefined);
  const [linkError, setLinkError] = useState<number[] | undefined>(undefined);

  const { arguments: previousValues, draftValues } = props;

  useEffect(() => {
    const fetchExistingAutomationNames = async () => {
      const items = await LocalStorage.allItems();
      let names = Object.keys(items);
      if (previousValues && previousValues.name) {
        names = names.filter((name) => name !== previousValues.name);
      }
      setExistingAutomationNames(names);
    };
    fetchExistingAutomationNames();
  }, []);

  const getLinksFromRawValues = (rawValues: AutomationFormValues) => {
    return Object.keys(rawValues)
      .filter((key) => key.startsWith("link-"))
      .sort((a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1])) // Sort by index
      .map((key) => rawValues[key]);
  };

  const getInitialName = () => {
    if (previousValues && previousValues.name) {
      return previousValues.name;
    }
    if (draftValues && draftValues.name) {
      return draftValues.name;
    }
    return "";
  };
  const getInitialDescription = () => {
    if (previousValues && previousValues.description) {
      return previousValues.description;
    }
    if (draftValues && draftValues.description) {
      return draftValues.description;
    }
    return "";
  };

  const getInitialValues = () => {
    if (previousValues && previousValues.name && previousValues.description) {
      return getLinksFromRawValues(previousValues);
    }

    if (draftValues) {
      return getLinksFromRawValues(draftValues);
    }

    return [""];
  };

  const [values, setValues] = useState<Array<string>>(getInitialValues());

  const dropNameErrorIfNeeded = () => {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  };
  const dropDescriptionErrorIfNeeded = () => {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  };
  const dropLinkErrorIfNeeded = (index: number) => {
    if (linkError && linkError.includes(index)) {
      setLinkError((prevErrors) => {
        const newErrors = prevErrors?.filter((errorIndex) => errorIndex !== index);
        return newErrors && newErrors.length > 0 ? newErrors : undefined;
      });
    }
  };

  const checkName = (name: string | undefined) => {
    if (!name || !name.trim()) {
      setNameError("Automation name cannot be empty");
      return;
    }
    if (name && existingAutomationNames.includes(name)) {
      setNameError("Automation name already exists");
      return;
    }
  };
  const checkDescription = (description: string | undefined) => {
    if (!description || !description.trim()) {
      setDescriptionError("Description cannot be empty");
      return;
    }
  };
  const checkLink = (index: number, value: string | undefined) => {
    if (!value) {
      setLinkError(linkError ? [...linkError, index] : [index]);
      return;
    }
    try {
      new URL(value);
      dropLinkErrorIfNeeded(index);
    } catch {
      setLinkError(linkError ? [...linkError, index] : [index]);
      return;
    }
  };

  const handleChange = (index: number, newValue: string) => {
    dropLinkErrorIfNeeded(index);
    setValues((prevValues) => {
      const newValues = [...prevValues];
      newValues[index] = newValue;
      return newValues;
    });
  };

  const addLink = () => {
    setValues((prevValues) => [...prevValues, ""]);
  };

  const removeLastLink = () => {
    setValues((prevValues) => {
      const newValues = [...prevValues];
      newValues.pop();
      return newValues;
    });
  };

  const handleSubmit = async (links: AutomationFormValues) => {
    try {
      if (previousValues && previousValues.name) {
        await LocalStorage.removeItem(previousValues.name);
      }
      await LocalStorage.setItem(links.name, JSON.stringify({ description: links.description, values: values }));
      popToRoot();
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `New automation created`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Error creating the automation" });
    }
  };

  return (
    <>
      <Form
        enableDrafts
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.CheckCircle} title="Submit" onSubmit={handleSubmit} />
            <Action
              title="Add Quicklink"
              icon={Icon.PlusCircle}
              onAction={addLink}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Remove Last Quicklink"
              icon={Icon.Trash}
              onAction={removeLastLink}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="name"
          error={nameError}
          onChange={dropNameErrorIfNeeded}
          onBlur={(e) => checkName(e.target.value)}
          defaultValue={getInitialName()}
          title="Automation name"
          placeholder="My new automation"
        />
        <Form.TextArea
          id="description"
          error={descriptionError}
          onChange={dropDescriptionErrorIfNeeded}
          onBlur={(e) => checkDescription(e.target.value)}
          defaultValue={getInitialDescription()}
          title="Description"
          placeholder="A short description of the automation"
        />
        <Form.Separator />
        {values.map((value, index) => (
          <Form.TextField
            id={`link-${index}`}
            value={value}
            error={linkError && linkError.includes(index) ? "Invalid Quicklink" : undefined}
            onBlur={(e) => checkLink(index, e.target.value)}
            onChange={(newValue) => handleChange(index, newValue)}
            title={`Quicklink ${index + 1}`}
            placeholder="https://google.com/search?q=Raycast"
            key={index}
          />
        ))}
      </Form>
    </>
  );
}
