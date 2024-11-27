import { closeMainWindow, open } from "@raycast/api";
import { XcodeService } from "./services/xcode.service";

export default async () => {
  await open(XcodeService.developerDocumentationURLScheme);
  await closeMainWindow();
};
