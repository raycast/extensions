import { showToast, Toast } from "@raycast/api";
import { execAwsm } from "./shared";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Clearing AWS sessions...",
  });

  try {
    execAwsm("clear");
    toast.style = Toast.Style.Success;
    toast.title = "Sessions cleared";
    toast.message = "Active AWS credentials have been removed.";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to clear sessions";
    toast.message = String(error);
  }
}
