import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DroneFeed, getMe, listMyBuilds } from "./drone";
import { isMine, repoMatches } from "./filter";
import { doCancel } from "./actions";

export default async function Command(): Promise<void> {
  try {
    const prefs = getPreferenceValues<Preferences>();
    if (!prefs.droneUrl || !prefs.droneToken) {
      await closeMainWindow();
      await showHUD("Set Drone URL and token in extension preferences");
      return;
    }

    const [me, feed] = await Promise.all([getMe(), listMyBuilds(1)]);

    const candidates = feed
      .filter(
        (f): f is DroneFeed & { build: NonNullable<DroneFeed["build"]> } =>
          f.build != null,
      )
      .filter((f) => prefs.filterMode === "all" || isMine(f.build, me))
      .filter((f) => repoMatches(f.slug, prefs))
      .filter((f) => f.build.status === "running")
      .sort((a, b) => (b.build.started || 0) - (a.build.started || 0));

    const target = candidates[0];
    if (!target) {
      await closeMainWindow();
      await showHUD("No running Drone builds to cancel");
      return;
    }

    // doCancel handles its own confirmAlert; on rejection we just exit silently.
    await doCancel(target.slug, target.build.number, { closeWindow: true });
  } catch (e) {
    await showFailureToast(e as Error, { title: "Drone API error" });
  }
}
