import { Toast, showToast } from "@raycast/api";
import { performAction } from "./appfreezer";
import { readableError } from "./errors";

export default async function ResumeAll() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Resuming all applications…",
  });
  try {
    await performAction("resume-all");
    toast.style = Toast.Style.Success;
    toast.title = "Resumed all applications";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not resume all applications";
    toast.message = readableError(error);
  }
}
