import { confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { isValidProjectName } from "./isValidProjectName";
import { projectExists } from "./projectExists";
import { ensureDir } from "./ensureDir";
import { initGit } from "./initGit";
import { getProjectPath } from "./getProjectPath";

interface ReturnValue {
  success: boolean;
  /**
   * Reason for failure
   */
  reason?: "invalid" | "existent" | "cancel" | "fail";
}

export async function createEmptyProject(name: string): Promise<ReturnValue> {
  const result = isValidProjectName(name);
  if (!result.valid) {
    await showToast({
      title: `Invalid project name "${name}"`,
      message: result.error,
      style: Toast.Style.Failure,
    });
    return {
      success: false,
      reason: "invalid",
    };
  }

  const existent = await projectExists(name);
  if (existent) {
    await showToast({
      title: `Project "${name}" already exists`,
      style: Toast.Style.Failure,
    });
    return {
      success: false,
      reason: "existent",
    };
  }

  const dir = getProjectPath(name);

  if (
    !(await confirmAlert({
      title: "Confirm creation",
      message: `Are you sure you want to create project "${name}"?`,
      icon: Icon.NewFolder,
    }))
  ) {
    return {
      success: false,
      reason: "cancel",
    };
  }

  if (!ensureDir(dir))
    return {
      success: false,
      reason: "fail",
    };

  await initGit(dir);

  return {
    success: true,
  };
}
