import { Toast, showToast } from "@raycast/api";
import { type HeadsetHandle, connectNearest, getNearestHeadset } from "./airbuddy";
import { failToast, showFailure } from "./feedback";
import { pollUntil } from "./poll";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to nearest headset…" });

  try {
    const nearest = await getNearestHeadset();

    if (!nearest) {
      failToast(toast, "No nearby headset", "AirBuddy doesn't see a headset right now.");
      return;
    }

    // Re-bind: TS does not carry the null-check above into the closure below.
    const target: HeadsetHandle = nearest;

    if (target.connected) {
      toast.style = Toast.Style.Success;
      toast.title = `${target.name} is already connected`;
      return;
    }

    toast.title = `Connecting to ${target.name}…`;

    await connectNearest();

    // Poll the HANDLE, not getDevices().
    //
    // Two bugs fixed here, both already solved for the favorite and not carried over:
    //   1. `nearest headset` resolves devices that are ABSENT from the devices collection (the same
    //      wall documented for the favorite), so polling getDevices() for its id can spin to the
    //      full timeout on a connect that actually succeeded.
    //   2. The old poll matched on NAME. Names are not unique — AirBuddy's own binary carries the
    //      error string `More than one device matches "`. Match on id.
    await pollUntil(
      () => getNearestHeadset(),
      (h) => h?.connected === true,
      {
        description: `${target.name} never connected`,
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = `Connected to ${target.name}`;
  } catch (error) {
    await showFailure("Couldn't connect to the nearest headset", error);
  }
}
