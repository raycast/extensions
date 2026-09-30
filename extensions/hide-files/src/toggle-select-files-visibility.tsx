import { closeMainWindow } from "@raycast/api";
import { hideFilesSelected } from "./utils/hide-files-utils";

export default async () => {
  await closeMainWindow();
  await hideFilesSelected();
};
