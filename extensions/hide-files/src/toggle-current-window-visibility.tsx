import { closeMainWindow } from "@raycast/api";
import { hideFilesInFolder } from "./utils/hide-files-utils";
import { getFinderPath } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow();
  const finderPath = await getFinderPath();
  await hideFilesInFolder(finderPath);
};
