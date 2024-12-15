import { showHUD, showToast, Toast } from "@raycast/api";
import { util_listDestinationInfo, util_startbackup } from "./util-destination";

export default async function () {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Backup...",
  });

  try {
    const destinations = await util_listDestinationInfo();
    let have_mountedDes = false;
    destinations.forEach((des) => {
      if (des.Kind == "Local" && des.MountPoint != undefined) {
        have_mountedDes = true;
      }
      if (des.Kind == "Network" && des.URL != undefined) {
        have_mountedDes = true;
      }
    });
    if (have_mountedDes) {
      await util_startbackup();
      toast.hide();
      showHUD("Backup Started !");
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No Backup Destination Mounted !";
      showHUD("No Backup Destination Mounted !");
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to Start Backup !";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
}
