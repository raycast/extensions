import { useState } from "react";
import { Form, ActionPanel, Action, showToast, popToRoot, Icon } from "@raycast/api";
import { setStorage, getStorage } from "./lib/utils";
import { StorageKey } from "./lib/constants";
import { Pin } from "./lib/Pins";
import { Group } from "./lib/Groups";

/**
 * Updates the ID of each pin/group such that there are no duplicates. The first item will have ID 0, the second 1, etc.
 * @param newItems The list of pins or groups to reassign IDs to.
 */
const reassignIDs = async (newItems: { id: number }[]) => {
  let currentID = 0;
  newItems.forEach((item: { id: number }) => {
    item.id = currentID;
    currentID++;
  });
  await setStorage(StorageKey.NEXT_PIN_ID, [currentID]);
};

/**
 * Merges the existing pins/groups with the imported pins/groups, removing any duplicate entries. Duplicate entries are determined by the name of the pin. The ID of each pin is updated to ensure that there are no duplicates.
 * @param dataItems The pins/groups to be imported.
 * @param oldItems The existing pins/groups.
 * @returns The merged list of pins/groups.
 */
const mergeRemovingDuplicates = async (
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

  await reassignIDs(newItems);
  return newItems;
};

/**
 * Imports pins and pin groups from JSON-parsed data.
 * @param data The JSON-parsed data to import.
 * @param importMethod The method to use when importing the data, e.g. Merge1 (maintain duplicates), Merge2 (remove duplicates), or Replace (replace all existing data).
 */
const importData = async (data: { groups: Group[]; pins: Pin[] }, importMethod: string) => {
  if (importMethod == "Merge1") {
    // Maintain duplicates
    // Update groups
    const oldGroups = await getStorage(StorageKey.LOCAL_GROUPS);
    const newGroups = oldGroups.concat(data.groups);
    await reassignIDs(newGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Update pins
    const oldPins = await getStorage(StorageKey.LOCAL_PINS);
    const newPins = oldPins.concat(data.pins);
    await reassignIDs(newPins);
    await setStorage(StorageKey.LOCAL_PINS, newPins);
    showToast({ title: "Merged Pin data!" });
  } else if (importMethod == "Merge2") {
    // Remove duplicates
    // Remove group duplicates
    const dataGroups = data.groups;
    const oldGroups = await getStorage(StorageKey.LOCAL_GROUPS);
    const newGroups = await mergeRemovingDuplicates(dataGroups, oldGroups);
    await reassignIDs(newGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Remove pin duplicates
    const dataPins = data.pins;
    const oldPins = await getStorage(StorageKey.LOCAL_PINS);
    const newPins = await mergeRemovingDuplicates(dataPins, oldPins);
    await reassignIDs(newPins);
    await setStorage(StorageKey.LOCAL_PINS, newPins);

    showToast({ title: "Updated Pin data!" });
  } else if (importMethod == "Replace") {
    // Replace all groups and pins
    await setStorage(StorageKey.LOCAL_GROUPS, data.groups);
    await setStorage(StorageKey.LOCAL_PINS, data.pins);

    const maxPinID = Math.max(...data.pins.map((pin) => pin.id));
    await setStorage(StorageKey.NEXT_PIN_ID, [maxPinID + 1]);

    const maxGroupID = Math.max(...data.groups.map((group) => group.id));
    await setStorage(StorageKey.NEXT_GROUP_ID, [maxGroupID + 1]);

    showToast({ title: "Replaced Pin data!" });
  }
  popToRoot();
};

/**
 * Checks if the JSON string is properly formatted. If not, displays an error message.
 * @param jsonString The JSON string to check.
 * @param setJSONError The function to call to set the error message.
 */
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

/**
 * Form view for importing pin data from a JSON string.
 * @returns A form view.
 */
const ImportDataForm = () => {
  const [jsonError, setJSONError] = useState<string | undefined>();

  // Display form for inputting JSON data
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              const data = JSON.parse(values.jsonStringField);
              await importData(data, values.importMethodField);
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
