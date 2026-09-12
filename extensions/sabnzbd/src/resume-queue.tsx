import { showToast, Toast } from "@raycast/api";
import { client } from "./sabnzbd";

export default async () => {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Resuming Queue" });
  try {
    await client.queueResume().then((result) => {
      if (!result.status || result.error) throw new Error();
    });
    toast.style = Toast.Style.Success;
    toast.title = "Resumed Queue";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not resume Queue";
  }
};
