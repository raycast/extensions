import { showToast, Toast } from "@raycast/api";
import { dockUtils } from "./dockutil";
import { execSync, ExecSyncOptionsWithBufferEncoding } from "child_process";

export const execDockutil = (command: string, options?: ExecSyncOptionsWithBufferEncoding): string => {
  const dockutilPath = dockUtils.getDockUtilPath();

  if (!dockutilPath) {
    void showToast({
      style: Toast.Style.Failure,
      title: "dockutil not found",
      message: "Please install dockutil using: brew install dockutil",
    });
    return "";
  }

  try {
    const output = execSync(`"${dockutilPath}" ${command}`, options || {});
    return output?.toString() || "";
  } catch (error) {
    void showToast({
      style: Toast.Style.Failure,
      title: "dockutil command failed",
      message: "Please check your dockutil installation",
    });
    throw error;
  }
};
