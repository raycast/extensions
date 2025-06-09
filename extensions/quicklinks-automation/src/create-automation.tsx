import { Action, ActionPanel, Form, Icon, LaunchProps, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AutomationFormValues } from "./types/types";

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
        console.log("Excluding precedent name from existing names:", previousValues.name);
        names = names.filter((name) => name !== previousValues.name);
      }
      setExistingAutomationNames(names);
      console.log("Existing automation names:", names);
    };
    fetchExistingAutomationNames();
  }, []);

  const getLinksFromRawValues = (rawValues: AutomationFormValues) => {
    console.log("Extracting links from raw values:", rawValues);
    return Object.keys(rawValues)
      .filter((key) => key.startsWith("link-"))
      .sort((a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1])) // Sort by index
      .map((key) => rawValues[key]);
  };

  const getInitialName = () => {
    if (previousValues && previousValues.name) {
      console.log("Using provided name:", previousValues.name);
      return previousValues.name;
    }
    if (draftValues && draftValues.name) {
      console.log("Using draft name:", draftValues.name);
      return draftValues.name;
    }
    return "";
  };
  const getInitialDescription = () => {
    if (previousValues && previousValues.description) {
      console.log("Using provided description:", previousValues.description);
      return previousValues.description;
    }
    if (draftValues && draftValues.description) {
      console.log("Using draft description:", draftValues.description);
      return draftValues.description;
    }
    return "";
  };

  const getInitialValues = () => {
    if (previousValues && previousValues.name && previousValues.description) {
      console.log("Using provided arguments for initial values:", previousValues);
      return getLinksFromRawValues(previousValues);
    }

    if (draftValues) {
      console.log("Using draft values for initial values:", draftValues);
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
      console.log("Dropping link error for index", index);
      setLinkError((prevErrors) => {
        const newErrors = prevErrors?.filter((errorIndex) => errorIndex !== index);
        return newErrors && newErrors.length > 0 ? newErrors : undefined;
      });
    }
  };

  const checkName = (name: string | undefined) => {
    console.log("Checking name:", name);
    if (!name) {
      setNameError("Automation name cannot be empty");
      return;
    }
    console.log("Existing automation names:", existingAutomationNames);
    if (name && existingAutomationNames.includes(name)) {
      setNameError("Automation name already exists");
      return;
    }
  };
  const checkDescription = (description: string | undefined) => {
    console.log("Checking description:", description);
    if (!description) {
      setDescriptionError("Description cannot be empty");
      return;
    }
  };
  const checkLink = (index: number, value: string | undefined) => {
    console.log("Checking link at index", index, "with value", value);
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
    console.log("Changing value at index", index, "to", newValue);
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
    console.log("Submitted values:", values);
    console.log("Stored values:", await LocalStorage.getItem(links.name));
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
        {values.map(
          (value, index) => (
            console.log("index", value, index),
            (
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
            )
          ),
        )}
      </Form>
    </>
  );
}
