import { useState } from "react";
import { Form, ActionPanel, Action, showToast, popToRoot, Icon } from "@raycast/api";
import { setStorage, getStorage } from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group } from "./types";

const reassignIDs = (newItems: { id: number }[]) => {
  let currentID = 0;
  newItems.forEach((item: { id: number }) => {
    item.id = currentID;
    currentID++;
  });
};

const mergeRemovingDuplicates = (
  dataItems: { name: string; id: number }[],
  oldItems: { name: string; id: number }[]
) => {
  // Merges lists of items, removing repeat entries
  const newItems = [...oldItems];
  dataItems.forEach((dataItem: { name: string; id: number }) => {
    let found = false;
    oldItems.forEach((oldItem: { name: string; id: number }) => {
      if (dataItem.name == oldItem.name) {
        found = true;
      }
    });

    if (!found) {
      newItems.push(dataItem);
    }
  });

  reassignIDs(newItems);
  return newItems;
};

const importData = async (data: { groups: Group[]; pins: Pin[] }, importMethod: string) => {
  if (importMethod == "Merge1") {
    // Maintain duplicates
    // Update groups
    const oldGroups = await getStorage(StorageKey.LOCAL_GROUPS);
    const newGroups = oldGroups.concat(data.groups);
    reassignIDs(newGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Update pins
    const oldPins = await getStorage(StorageKey.LOCAL_PINS);
    const newPins = oldPins.concat(data.pins);
    reassignIDs(newPins);
    await setStorage(StorageKey.LOCAL_PINS, newPins);
    showToast({ title: "Merged Pin data!" });
  } else if (importMethod == "Merge2") {
    // Remove duplicates
    // Remove group duplicates
    const dataGroups = data.groups;
    const oldGroups = await getStorage(StorageKey.LOCAL_GROUPS);
    const newGroups = mergeRemovingDuplicates(dataGroups, oldGroups);
    reassignIDs(newGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Remove pin duplicates
    const dataPins = data.pins;
    const oldPins = await getStorage(StorageKey.LOCAL_PINS);
    const newPins = mergeRemovingDuplicates(dataPins, oldPins);
    reassignIDs(newPins);
    await setStorage(StorageKey.LOCAL_PINS, newPins);

    showToast({ title: "Updated Pin data!" });
  } else if (importMethod == "Replace") {
    // Replace all groups and pins
    await setStorage(StorageKey.LOCAL_GROUPS, data.groups);
    await setStorage(StorageKey.LOCAL_PINS, data.pins);
    showToast({ title: "Replaced Pin data!" });
  }
  popToRoot();
};

const checkJSONFormat = (jsonString: string, setJSONError: (error: string | undefined) => void) => {
  // Check for properly formatted pin data JSON string
  let error = null;
  try {
    const data = JSON.parse(jsonString);
    if (!("groups" in data)) {
      error = "Group data missing from JSON string!";
    }

    if (!("pins" in data)) {
      error = "Pin data missing from JSON string!";
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
        info={`'Merge, Maintain duplicates' keeps existing and newly specified items, potentially producing duplicate entries.
      
'Merge, Remove duplicates' keeps all existing items and any new items with a unique name.
      
'Replace all data' removes existing items and add the newly specified items.`}
      >
        <Form.Dropdown.Item key="Merge1" title="Merge, Maintain duplicates" value="Merge1" />
        <Form.Dropdown.Item key="Merge2" title="Merge, Remove duplicates" value="Merge2" />
        <Form.Dropdown.Item key="Replace" title="Replace all data" value="Replace" />
      </Form.Dropdown>

      <Form.TextArea
        id="jsonStringField"
        title="JSON String"
        placeholder="Enter a JSON string..."
        error={jsonError}
        onChange={(jsonString) => checkJSONFormat(jsonString, setJSONError)}
        info={`Must be a valid JSON string specifying groups and pins. For example:

{"groups":[{"name":"Group","icon":"Plus","id":1}],"pins":[{"name":"Pin","url":"https://google.com","icon":"Link","group":"Group","id":1}]}`}
      />
    </Form>
  );
};

export default function Command() {
  return <ImportDataForm />;
}
