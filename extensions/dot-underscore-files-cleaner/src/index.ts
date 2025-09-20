import { showHUD, getSelectedFinderItems, confirmAlert, Alert, Icon, Color } from "@raycast/api";
import { deleteDotUnderscoreFiles, isFile } from "./utils";

export default async function main() {
  try {
    const files = await getSelectedFinderItems();
    const paths = files.map((item) => item.path);
    const directoryPaths = paths.filter((path) => !isFile(path));

    if (!directoryPaths.length) {
      await showHUD("No folders selected");
      return;
    }

    const folderNamesString = directoryPaths
      .map((path) => {
        if (path.length === 1) return `"${path}"`;
        const folderName = path.split("/").at(-2);
        return `"${folderName}"`;
      })
      .join(", ");

    const options: Alert.Options = {
      title: "Are you sure you want to delete ._ files in the following directories?",
      message: folderNamesString,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      directoryPaths.forEach(deleteDotUnderscoreFiles);
      await showHUD("._ files deleted");
    }
  } catch (error) {
    console.error(error);
    await showHUD("No folders selected");
  }
}
