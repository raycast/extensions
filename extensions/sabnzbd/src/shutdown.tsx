import { showToast, Toast } from "@raycast/api";
import { client } from "./sabnzbd";

export default async () => {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Shutting down" });
  try {
    await client.shutdown().then((result) => {
      if (!result.status || result.error) throw new Error();
    });
    toast.style = Toast.Style.Success;
    toast.title = "Shut down";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not shut down";
  }
};
