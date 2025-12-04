import { Action, ActionPanel, Form, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import * as os from "os";
import * as fs from "fs";
import { getAllStations, loadDefaults } from "./utils";

interface ExportFormValues {
  dirPath: string[];
}

export default function Command() {
  const downloadsFolder = `${os.homedir()}/Downloads`;
  const { handleSubmit, itemProps } = useForm<ExportFormValues>({
    initialValues: {
      dirPath: [downloadsFolder],
    },
    validation: {
      dirPath: FormValidation.Required,
    },
    async onSubmit(values) {
      // Get station data as string
      await loadDefaults();
      const savedStations = await getAllStations();
      const stationsJSONstring = JSON.stringify(savedStations);

      // Determine filename
      let fileName = "stations-export";
      let fileNum = 1;
      while (fs.existsSync(`${values.dirPath[0]}/${fileName}.json`)) {
        fileNum++;
        fileName = `stations-export ${fileNum}`;
      }

      // Write file
      fs.writeFileSync(`${values.dirPath[0]}/${fileName}.json`, stationsJSONstring);
      await showToast({ title: `Exported ${Object.keys(savedStations).length} Stations` });
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
        title="Export Saved Stations"
        text="Exporting will back up your list of saved stations and all their associated data. You can import the resulting JSON file to restore the backed-up stations on this device or another."
      />

      <Form.FilePicker
        title="Export Directory"
        info="Where to save the station data JSON file to"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        {...itemProps.dirPath}
      />
    </Form>
  );
}
