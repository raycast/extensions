import { showToast, ToastStyle } from "@raycast/api";
import { isLeft } from "fp-ts/lib/Either";
import { getCurrentTrack } from "./util/controls";

export default async () => {
  const track = await getCurrentTrack()();

  if (isLeft(track)) {
    showToast(ToastStyle.Failure, "Could not get currently playing track");
    return;
  }

  showToast(ToastStyle.Success, track.right.name, `${track.right.album} - ${track.right.artist}`);
};
