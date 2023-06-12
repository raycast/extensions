import { Form, ActionPanel, Action, showToast, Icon, Toast, showHUD, popToRoot } from "@raycast/api";
import fs from "fs";
import path from "path";
import { convertCsvToXlsx } from "@aternus/csv-to-xlsx";

type Values = {
  files: string[];
};

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min) + min);
}

export default function Command() {
  async function handleSubmit(values: Values) {
    const file = values.files[0];

    if (!file) {
      showToast(Toast.Style.Failure, "You need choose a CSV file");

      return false;
    }

    const fileExtension = path.extname(file);

    if (fileExtension !== ".csv") {
      showToast(Toast.Style.Failure, "Failed to convert this CSV file", "File extension is not CSV");

      return false;
    }

    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
      showToast(Toast.Style.Failure, "Failed to convert this CSV file", "File not found");

      return false;
    }

    const fileName = path.basename(file, fileExtension);
    const dirName = path.dirname(file);
    let destination = path.join(dirName, `${fileName}.xlsx`);

    if (fs.existsSync(destination)) {
      destination = path.join(dirName, `${fileName}_${getRandomInt(1, 1000)}.xlsx`);
    }

    try {
      convertCsvToXlsx(file, destination);

      await showHUD(`✅ Converted to the «${dirName}» directory`);
      await popToRoot();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Failed to convert this CSV file", error.message);
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Hammer} title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="CSV File" allowMultipleSelection={false} />
    </Form>
  );
}
