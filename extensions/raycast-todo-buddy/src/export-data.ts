import { showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getAllData } from "./repository/localStorage";

export default async function Command() {
  try {
    // Retrieve all stored data
    const allItems = await getAllData();
    const jsonData = JSON.stringify(allItems, null, 2); // Format as pretty JSON

    const saveDirectory = path.join(os.homedir(), "Downloads");
    const fileName = "raycast_todo_buddy_export.json";
    const filePath = path.join(saveDirectory, fileName);

    // Write data to file
    fs.writeFileSync(filePath, jsonData);

    // Notify user of success
    await showToast(Toast.Style.Success, "Exported", `~/Downloads/${fileName}`);
  } catch (error) {
    console.error(error);
    await showToast(Toast.Style.Failure, "Export Failed", "An error occurred while exporting the data.");
  }
}
