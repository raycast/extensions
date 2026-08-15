import { open, showToast, Toast } from "@raycast/api";

import { getErrorMessage } from "./errors";
import { expandHome, toTildePath } from "./paths";

type EditorApplication = string | { path?: string; bundleId?: string; name?: string };

export async function openDirectoryInEditor(directory: string, application: EditorApplication) {
  const appArg = typeof application === "string" ? application : (application.path ?? application.bundleId ?? "");
  if (!appArg) return;
  const resolvedDirectory = expandHome(directory);

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening in editor",
    message: toTildePath(resolvedDirectory),
  });

  try {
    await open(resolvedDirectory, appArg);
    toast.style = Toast.Style.Success;
    toast.title = "Opened in editor";
    toast.message = toTildePath(resolvedDirectory);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't open editor";
    toast.message = getErrorMessage(error);
  }
}
