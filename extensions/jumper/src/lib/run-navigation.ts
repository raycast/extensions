import { closeMainWindow, environment, LocalStorage, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { loadHistory } from "./load-history";
import { activateApp } from "./macos";
import { navigate, type Direction, type NavState } from "./navigation";

const STATE_KEY = "nav-state";

const MESSAGES = {
  "no-apps": "No running apps found",
  "no-back": "No earlier app in history",
  "no-forward": "No later app in history",
} as const;

/** Step timings, logged only in development (`npm run dev`). Grep the dev log for "PERF". See https://github.com/mattherwig/jumper/blob/main/docs/PERFORMANCE.md. */
function timer() {
  const t0 = performance.now();
  if (environment.isDevelopment) console.log(`PERF start ${Date.now()}`);
  return (label: string) => {
    if (environment.isDevelopment) console.log(`PERF ${label} ${(performance.now() - t0).toFixed(1)}ms`);
  };
}

/** Shared body of the Back / Forward / Toggle no-view commands. */
export async function runNavigation(direction: Direction): Promise<void> {
  const lap = timer();
  try {
    const [, apps, raw] = await Promise.all([
      // Hide Raycast before switching; otherwise, when launched from the Raycast window or a deeplink,
      // Raycast hands focus back to the previous app after we switch, undoing the jump.
      closeMainWindow({ popToRootType: PopToRootType.Immediate }),
      loadHistory(),
      LocalStorage.getItem<string>(STATE_KEY),
    ]);
    lap("read");
    const prev = raw ? (JSON.parse(raw) as NavState) : undefined;

    const result = navigate(
      direction,
      apps.map((a) => a.bundleId),
      prev,
    );
    if (!result.ok) {
      await showHUD(MESSAGES[result.reason]);
      return;
    }

    const target = apps.find((a) => a.bundleId === result.target);
    if (target) await activateApp(target);
    lap("activated");
    await LocalStorage.setItem(STATE_KEY, JSON.stringify(result.state));
  } catch (error) {
    await showFailureToast(error, { title: "Could not switch app" });
  }
}
