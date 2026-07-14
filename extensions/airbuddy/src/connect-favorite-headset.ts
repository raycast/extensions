import { Toast, showToast } from "@raycast/api";
import { type FavoriteHeadset, connectFavorite, getFavoriteHeadset } from "./airbuddy";
import { failToast, showFailure } from "./feedback";
import { pollUntil } from "./poll";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to favorite headset…" });

  try {
    // Resolve the favorite FIRST — it works even when the headset is in its case and absent
    // from the devices list. If there isn't one, fail now rather than dispatching a doomed connect.
    const favorite = await getFavoriteHeadset();

    if (!favorite) {
      failToast(toast, "No favorite headset", "Star a headset in AirBuddy's Devices settings first.");
      return;
    }

    // Re-bind: TS does not carry the null-check above into the closure below.
    const target: FavoriteHeadset = favorite;

    if (target.connected) {
      toast.style = Toast.Style.Success;
      toast.title = `${target.name} is already connected`;
      return;
    }

    toast.title = `Connecting to ${target.name}…`;

    await connectFavorite();

    // Poll the FAVORITE HANDLE, not getDevices(). The favorite is routinely absent from the
    // devices collection (it's the only window past the live-devices wall), so searching
    // getDevices() for its id can spin until timeout on a connect that actually succeeded.
    await pollUntil(
      () => getFavoriteHeadset(),
      (f) => f?.connected === true,
      { description: `${target.name} never connected` },
    );

    toast.style = Toast.Style.Success;
    toast.title = `Connected to ${target.name}`;
  } catch (error) {
    await showFailure("Couldn't connect to the favorite headset", error);
  }
}
