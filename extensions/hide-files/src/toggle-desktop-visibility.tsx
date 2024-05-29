import { homedir } from "os";
import { closeMainWindow } from "@raycast/api";
import { hideFilesInFolder } from "./utils/hide-files-utils";

export default async () => {
  await closeMainWindow();
  await hideFilesInFolder(homedir() + "/Desktop/");
};
