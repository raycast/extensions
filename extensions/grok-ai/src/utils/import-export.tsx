import { showToast, Toast, confirmAlert, Alert, Icon, LocalStorage, open } from "@raycast/api";
import { writeFile, readFile } from "fs/promises";
import moment from "moment";
import { homedir } from "os";
import { join } from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ExportData(data: any, moduleName: string) {
  const timestamp = moment().format("YYMMDD-HHmmss");
  const filename = `Downloads/raycast-chatgpt-${moduleName}-${timestamp}.json`;
  writeFile(join(homedir(), filename), JSON.stringify(data, null, 2))
    .then(() => {
      showToast({
        title: `${moduleName} exported`,
        message: `to ~/${filename}`,
        style: Toast.Style.Success,
        primaryAction: {
          title: "Open File",
          onAction: () => open(join(homedir(), filename)),
        },
        secondaryAction: {
          title: "Open Folder",
          onAction: () => open(join(homedir(), "Downloads")),
        },
      });
    })
    .catch((error) => {
      showToast({
        title: `Failed to export ${moduleName}`,
        message: error.message,
        style: Toast.Style.Failure,
      });
    });
}

export async function ImportData<T>(localStorageKey: string, file: string): Promise<T[]> {
  const data = await readFile(file);
  const parsedData = JSON.parse(data.toString());
  return new Promise<T[]>((resolve, reject) => {
    confirmAlert({
      title: "Import will overwrite your current data",
      message: "This action cannot be undone",
      icon: Icon.Download,
      primaryAction: {
        title: "Import",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          LocalStorage.setItem(localStorageKey, JSON.stringify(parsedData))
            .then(() => {
              showToast({
                title: "Data imported",
                message: `from ${file}`,
                style: Toast.Style.Success,
              });
              console.log("Imported data", parsedData);
              resolve(parsedData);
            })
            .catch((error) => {
              showToast({
                title: "Failed to import data",
                message: error.message,
                style: Toast.Style.Failure,
              });
              reject(error);
            });
        },
      },
    });
  });
}
