import { showToast, Toast } from "@raycast/api";
import { client } from "./sabnzbd";

export default async () => {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Restarting" });
  try {
    await client.restart().then((result) => {
      if (!result.status || result.error) throw new Error();
    });
    toast.style = Toast.Style.Success;
    toast.title = "Restarted";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not Restart";
  }
};
