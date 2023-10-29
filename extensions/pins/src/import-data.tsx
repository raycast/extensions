import * as fs from "fs";
import Papa from "papaparse";
import path from "path";
import { useState } from "react";
import * as XML from "xml-js";
import YAML from "yaml";

import * as TOML from "@iarna/toml";
import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";

import { StorageKey } from "./lib/constants";
import { Group, SortStrategy } from "./lib/Groups";
import { Pin } from "./lib/Pins";
import { getStorage, setStorage } from "./lib/utils";

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
const importJSONData = async (data: { groups?: Group[]; pins?: Pin[] }, importMethod: string) => {
  if (importMethod == "Merge1") {
    // Maintain duplicates
    // Update groups
    const oldGroups = await getStorage(StorageKey.LOCAL_GROUPS);
    const newGroups = oldGroups.concat(data.groups || []);
    await reassignIDs(newGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Update pins
    const oldPins = await getStorage(StorageKey.LOCAL_PINS);
    const newPins = oldPins.concat(data.pins || []);
    await reassignIDs(newPins);
    await setStorage(StorageKey.LOCAL_PINS, newPins);
    showToast({ title: "Merged Pin data!" });
  } else if (importMethod == "Merge2") {
    // Remove duplicates
    // Remove group duplicates
    const dataGroups = data.groups;
    const oldGroups = await getStorage(StorageKey.LOCAL_GROUPS);
    const newGroups = await mergeRemovingDuplicates(dataGroups || [], oldGroups);
    await reassignIDs(newGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, newGroups);

    // Remove pin duplicates
    const dataPins = data.pins || [];
    const oldPins = await getStorage(StorageKey.LOCAL_PINS);
    const newPins = await mergeRemovingDuplicates(dataPins, oldPins);
    await reassignIDs(newPins);
    await setStorage(StorageKey.LOCAL_PINS, newPins);

    showToast({ title: "Updated Pin data!" });
  } else if (importMethod == "Replace") {
    // Replace all groups and pins
    if (data.pins) {
      await setStorage(StorageKey.LOCAL_PINS, data.pins);
      const maxPinID = Math.max(...data.pins.map((pin) => pin.id));
      await setStorage(StorageKey.NEXT_PIN_ID, [maxPinID + 1]);
    }

    if (data.groups) {
      await setStorage(StorageKey.LOCAL_GROUPS, data.groups);
      const maxGroupID = Math.max(...data.groups.map((group) => group.id));
      await setStorage(StorageKey.NEXT_GROUP_ID, [maxGroupID + 1]);
    }

    showToast({ title: "Replaced Pin data!" });
  }
  popToRoot();
};

/**
 * Imports Pins and Groups from CSV data.
 * @param data The CSV data to import.
 * @param importMethod The merge method to use to resolve duplicate entry conflicts.
 */
const importCSVData = async (data: string[][], importMethod: string) => {
  const fieldNames = data[0];
  if (fieldNames.includes("url")) {
    // The file contains Pin data
    const newPins: Pin[] = data.slice(1).map((row) => {
      const nameIndex = fieldNames.indexOf("name");
      const urlIndex = fieldNames.indexOf("url");
      const iconIndex = fieldNames.indexOf("icon");
      const groupIndex = fieldNames.indexOf("group");
      const idIndex = fieldNames.indexOf("id");
      const applicationIndex = fieldNames.indexOf("application");
      const expireDateIndex = fieldNames.indexOf("expireDate");
      const fragmentIndex = fieldNames.indexOf("fragment");
      const lastOpenedIndex = fieldNames.indexOf("lastOpened");
      const timesOpenedIndex = fieldNames.indexOf("timesOpened");
      const dateCreatedIndex = fieldNames.indexOf("dateCreated");
      const iconColorIndex = fieldNames.indexOf("iconColor");
      const averageExecutionTimeIndex = fieldNames.indexOf("averageExecutionTime");

      return {
        name: row[nameIndex],
        url: row[urlIndex],
        icon: row[iconIndex],
        group: row[groupIndex],
        id: parseInt(row[idIndex]),
        application: applicationIndex == -1 ? "None" : row[applicationIndex],
        expireDate: expireDateIndex == -1 ? undefined : row[expireDateIndex],
        fragment: fragmentIndex == -1 ? undefined : row[fragmentIndex] == "true",
        lastOpened: lastOpenedIndex == -1 ? undefined : row[lastOpenedIndex],
        timesOpened: timesOpenedIndex == -1 ? undefined : parseInt(row[timesOpenedIndex]),
        dateCreated: dateCreatedIndex == -1 ? undefined : row[dateCreatedIndex],
        iconColor: iconColorIndex == -1 ? undefined : row[iconColorIndex],
        averageExecutionTime: averageExecutionTimeIndex == -1 ? undefined : parseInt(row[averageExecutionTimeIndex]),
      };
    });
    await importJSONData({ pins: newPins }, importMethod);
  } else {
    // The file contains Group data
    const newGroups: Group[] = data.slice(1).map((row) => {
      const nameIndex = fieldNames.indexOf("name");
      const iconIndex = fieldNames.indexOf("icon");
      const iconColorIndex = fieldNames.indexOf("iconColor");
      const sortStrategyIndex = fieldNames.indexOf("sortStrategy");
      const idIndex = fieldNames.indexOf("id");

      return {
        name: row[nameIndex],
        icon: row[iconIndex],
        iconColor: iconColorIndex == -1 ? undefined : row[iconColorIndex],
        sortStrategy: sortStrategyIndex == -1 ? undefined : (row[sortStrategyIndex] as SortStrategy),
        id: parseInt(row[idIndex]),
      };
    });
    await importJSONData({ groups: newGroups }, importMethod);
  }
};

/**
 * Imports Pins and Groups from XML data.
 * @param data The XML data to import.
 * @param importMethod The merge method to use to resolve duplicate entry conflicts.
 */
const importXMLData = async (
  data: { groups?: XML.ElementCompact[]; pins?: XML.ElementCompact[] },
  importMethod: string
) => {
  // Convert XML elements to JSON-serializable objects (extract text from _text property of each element)
  const dataWrapper = {
    pins: data.pins?.map(
      (pin) =>
        Object.fromEntries(
          Object.entries(pin).map(([key, value]) => {
            return [key, value._text];
          })
        ) as Pin
    ),
    groups: data.groups?.map(
      (group) =>
        Object.fromEntries(
          Object.entries(group).map(([key, value]) => {
            return [key, value._text];
          })
        ) as Group
    ),
  };
  await importJSONData(dataWrapper, importMethod);
};

/**
 * Imports Pins and Groups from a file (generally one previously exported from this extension). Supports JSON, CSV, TOML, YAML, and XML files.
 * @param file The file to import from.
 * @param importMethod The merge method to use to resolve duplicate entry conflicts.
 */
const importDataFromFile = async (file: string, importMethod: string) => {
  const fileExtension = path.extname(file);
  const rawData = fs.readFileSync(file).toString();
  if (fileExtension == ".json") {
    const data = JSON.parse(rawData.toString());
    await importJSONData(data, importMethod);
  } else if (fileExtension == ".csv") {
    const data = Papa.parse(rawData).data as string[][];
    await importCSVData(data, importMethod);
  } else if (fileExtension == ".toml") {
    const data = TOML.parse(rawData);
    await importJSONData(data, importMethod);
  } else if (fileExtension == ".yaml") {
    const data = YAML.parse(rawData);
    await importJSONData(data, importMethod);
  } else if (fileExtension == ".xml") {
    const data = (
      XML.xml2js(rawData, { compact: true }) as {
        data: { pins?: XML.ElementCompact[]; groups?: XML.ElementCompact[] };
      }
    ).data;
    await importXMLData(data, importMethod);
  }
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

const checkFileValidity = (file: string, setFileError: (error: string | undefined) => void) => {
  let error = undefined;
  const fileExtension = path.extname(file);
  const acceptedFileExtensions = [".json", ".csv", ".toml", ".yaml", ".xml"];
  if (!acceptedFileExtensions.includes(fileExtension)) {
    error = "Invalid File Type";
  }

  setFileError(error);
};

/**
 * Form view for importing pin data from a JSON string.
 * @returns A form view.
 */
const ImportDataForm = () => {
  const [jsonContent, setJSONContent] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [jsonError, setJSONError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              if (values.jsonStringField) {
                const data = JSON.parse(values.jsonStringField);
                await importJSONData(data, values.importMethodField);
              } else {
                try {
                  await importDataFromFile(values.dataFileField[0], values.importMethodField);
                } catch (error) {
                  console.error(error);
                  await showToast({ title: "Error Reading File", style: Toast.Style.Failure });
                }
              }
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

      {selectedFile ? null : (
        <Form.TextArea
          id="jsonStringField"
          title="JSON String"
          placeholder="Enter a JSON string..."
          error={jsonError}
          onChange={(jsonString) => {
            checkJSONFormat(jsonString, setJSONError);
            setJSONContent(jsonString);
          }}
          info={`Must be a valid JSON string specifying groups and pins. For example:

{"groups":[{"name":"Group","icon":"Plus","id":1}],"pins":[{"name":"Pin","url":"https://google.com","icon":"Link","group":"Group","id":1}]}`}
        />
      )}

      {!selectedFile && !jsonContent ? <Form.Description title="" text="OR" /> : null}

      {jsonContent ? null : (
        <Form.FilePicker
          title="Data File"
          id="dataFileField"
          info={`A file containing Pins data in any of the following formats: JSON, CSV, TOML, YAML, or XML.
          
Note: When importing CSV files, import groups first, then pins.`}
          error={fileError}
          allowMultipleSelection={false}
          onChange={(files) => {
            checkFileValidity(files[0], setFileError);
            setSelectedFile(files[0]);
          }}
        />
      )}
    </Form>
  );
};

/**
 * Raycast command for importing pins and groups from a JSON string.
 */
export default function ImportPinsDataCommand() {
  return <ImportDataForm />;
}
