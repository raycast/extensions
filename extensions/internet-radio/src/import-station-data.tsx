import { Action, ActionPanel, Form, launchCommand, LaunchType, LocalStorage, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import * as fs from "fs";
import { StationListObject } from "./types";
import { deleteStation, deleteTrack, getAllStations } from "./utils";

interface ImportFormValues {
  filePath: string[];
  mergeType: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<ImportFormValues>({
    initialValues: {
      mergeType: "merge",
    },
    validation: {
      filePath: (value) => {
        if (value == undefined) {
          return "Please specify a JSON file";
        }

        if (!fs.existsSync(value[0]) || !fs.lstatSync(value[0]).isFile()) {
          return "File does not exist!";
        }

        try {
          const fileContent = fs.readFileSync(value[0], "utf-8");
          JSON.parse(fileContent);
        } catch (error) {
          return "File must contain valid JSON";
        }
      },
      mergeType: FormValidation.Required,
    },
    async onSubmit(values) {
      // Load JSON from file
      const fileContent = fs.readFileSync(values.filePath[0], "utf-8");
      const stationList = JSON.parse(fileContent);
      const savedStationList = await getAllStations();
      let numImported = 0;

      if (values.mergeType == "replace") {
        // Remove existing station data
        await new Promise<boolean>((resolve) => {
          if (values.mergeType == "replace") {
            Object.entries(savedStationList).forEach(async ([sName, sData]) => {
              await deleteTrack(undefined, `Raycast: ${sName}`);
              await deleteStation(sName, sData);
              if (Object.keys(await getAllStations()).length == 0) {
                resolve(true);
              }
            });
          }
        });
      }

      for (const station in stationList) {
        if (station == "default") {
          continue;
        }

        for (const key in (stationList as StationListObject)[station]) {
          let value = (stationList as StationListObject)[station][key];
          if (Array.isArray(value)) {
            value = value.join(",") + ",";
          }

          if (values.mergeType == "keep") {
            let itemKey = `station~${station}#${key}`;
            let existingItem = await LocalStorage.getItem(itemKey);
            let iter = 1;
            while (existingItem != undefined) {
              if (iter == 1) {
                itemKey = itemKey.replace("#", ` (${iter})#`);
              } else {
                itemKey = itemKey.replace(/ \([0-9]*\)#/, ` (${iter})#`);
              }
              existingItem = await LocalStorage.getItem(itemKey);
              iter++;
            }
            LocalStorage.setItem(itemKey, value as string);
          } else {
            await LocalStorage.setItem(`station~${station}#${key}`, value as string);
          }
        }
        numImported++;
      }

      await launchCommand({ name: "browse-saved-stations", type: LaunchType.UserInitiated });
      showToast({ title: `Imported ${numImported} Station${numImported == 1 ? "" : "s"}` });
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Import Stations"
        text="Importing station data from a valid JSON file will add the stations to your saved stations list. You can specify whether to replace or keep your existing stations as well as how to handle station entires with duplicate names."
      />

      <Form.Dropdown title="Merge Method" {...itemProps.mergeType}>
        <Form.Dropdown.Item value="merge" title="Keep Existing Stations, Update Duplicate Entries" />
        <Form.Dropdown.Item value="keep" title="Keep Existing Stations, Preserve Duplicates" />
        <Form.Dropdown.Item value="replace" title="Remove & Replace Existing Stations" />
      </Form.Dropdown>

      <Form.FilePicker
        title="Stations JSON File"
        info="A JSON file containing valid internet radio station data"
        allowMultipleSelection={false}
        {...itemProps.filePath}
      />
    </Form>
  );
}
