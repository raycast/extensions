import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BuildStatus, DroneFeed, getMe, listMyBuilds } from "./drone";
import { isMine, makeRepoMatcher } from "./filter";
import { doRestart } from "./actions";

const FAIL_STATUSES: ReadonlySet<BuildStatus> = new Set<BuildStatus>([
  "failure",
  "error",
  "killed",
]);

export default async function Command(): Promise<void> {
  try {
    const prefs = getPreferenceValues<Preferences>();
    if (!prefs.droneUrl || !prefs.droneToken) {
      await closeMainWindow();
      await showHUD("Set Drone URL and token in extension preferences");
      return;
    }

    const [me, feed] = await Promise.all([getMe(), listMyBuilds(1)]);

    const matcher = makeRepoMatcher(prefs);
    const candidates = feed
      .filter(
        (f): f is DroneFeed & { build: NonNullable<DroneFeed["build"]> } =>
          f.build != null,
      )
      .filter((f) => prefs.filterMode === "all" || isMine(f.build, me))
      .filter((f) => matcher(f.slug))
      .filter((f) => FAIL_STATUSES.has(f.build.status))
      .sort(
        (a, b) =>
          (b.build.finished || b.build.started) -
          (a.build.finished || a.build.started),
      );

    const target = candidates[0];
    if (!target) {
      await closeMainWindow();
      await showHUD("No failed Drone builds to restart");
      return;
    }

    await doRestart(target.slug, target.build.number, { closeWindow: true });
  } catch (e) {
    await showFailureToast(e as Error, { title: "Drone API error" });
  }
}
