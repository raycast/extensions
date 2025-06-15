import { open } from "@raycast/api";
import { errorHandle, getConfig } from "./lib/utils";
import { cachePath } from "./lib/constant";

export default async () => {
  const { defaultEditor } = getConfig();
  const appPath = defaultEditor?.name ?? "";
  if (!appPath) {
    errorHandle(new Error("112"));
    return;
  }

  await open(cachePath, appPath);
};
