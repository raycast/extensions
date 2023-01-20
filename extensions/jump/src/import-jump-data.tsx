import { useState } from "react";
import { LocalStorage, Form, ActionPanel, Action, showToast, popToRoot, Icon } from "@raycast/api";

const importData = async (data: { [x: string]: number }, importMethod: string) => {
  if (importMethod == "Merge") {
    const entries = await LocalStorage.allItems<LocalStorage.Values>();

    Object.entries(entries).forEach(([key]) => {
      if (key in data) {
        Promise.resolve(LocalStorage.setItem(key, data[key])).then(() => delete data[key]);
      }
    });

    for (const key in data) {
      await LocalStorage.setItem(key, data[key]);
    }

    showToast({ title: "Updated Jump data!" });
  } else if (importMethod == "Replace") {
    // Replace all destnations and weights
    await LocalStorage.clear();
    for (const key in data) {
      await LocalStorage.setItem(key, data[key]);
    }
    showToast({ title: "Replaced Jump data!" });
  }
  popToRoot();
};

const checkJSONFormat = (jsonString: string, setJSONError: (error: string | undefined) => void) => {
  // Check for properly formatted jump data JSON string
  let error = null;
  try {
    const data = JSON.parse(jsonString);
    for (const key in data) {
      if (!parseFloat(data[key])) {
        error = "Unexpected data type in place of numeric weights.";
        break;
      }
    }
  } catch {
    error = "Please enter a valid JSON string!";
  }

  if (error) {
    setJSONError(error);
  } else {
    setJSONError(undefined);
  }
};

const ImportDataForm = () => {
  const [jsonError, setJSONError] = useState<string | undefined>();

  // Display form for inputting JSON data
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={(values) => {
              const data = JSON.parse(values.jsonStringField);
              Promise.resolve(importData(data, values.importMethodField));
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="importMethodField"
        title="Import Method"
        defaultValue="Replace"
        info={`'Merge' updates the weights of existing entries and adds any new entries with a unique name.
      
'Replace All Data' removes existing entries and adds the newly specified entries.`}
      >
        <Form.Dropdown.Item key="Merge" title="Merge" value="Merge" />
        <Form.Dropdown.Item key="Replace" title="Replace All Data" value="Replace" />
      </Form.Dropdown>

      <Form.TextArea
        id="jsonStringField"
        title="JSON String"
        placeholder="Enter a JSON string..."
        error={jsonError}
        onChange={(jsonString) => checkJSONFormat(jsonString, setJSONError)}
        info={`Must be a valid JSON string specifying destinations and weights. For example:

{"https://google.com":1.1880000000000002,"https://mail.google.com":1.05,"/System/Applications/Calendar.app":1.05}`}
      />
    </Form>
  );
};

export default function Command() {
  return <ImportDataForm />;
}
