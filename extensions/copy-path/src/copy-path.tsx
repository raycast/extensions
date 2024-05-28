import { closeMainWindow, getFrontmostApplication } from "@raycast/api";
import { finderName } from "./utils/constants";
import { copyPath, copyUrl } from "./utils/common-utils";

export default async () => {
  await closeMainWindow();
  const frontmostApp = await getFrontmostApplication();
  if (frontmostApp.name === finderName) {
    // get finder path
    await copyPath();
  } else {
    // get browser web page url
    await copyUrl(frontmostApp);
  }
};
