import { Icon } from "@raycast/api";
import { formatTime } from "./formatUtils";
import { Preferences, Stopwatch, Timer } from "./types";

const formatMenuBarTitle = <T extends Timer | Stopwatch>(
  state: T[] | undefined,
  prefs: Preferences,
): string | undefined => {
  if (state === undefined || state?.length === 0 || state.length == undefined) return undefined;

  const runTime = "timeLeft" in state[0] ? state[0].timeLeft : state[0].timeElapsed;
  if (prefs.showTitleInMenuBar) {
    return `${state[0].name}: ~${formatTime(runTime)}`;
  } else {
    return `~${formatTime(runTime)}`;
  }
};

const formatMenuBarIcon = <T>(state: T[] | undefined, prefs: Preferences, icon: Icon): Icon | undefined => {
  switch (prefs.showMenuBarIconWhen) {
    case "always":
      return icon;
    case "never":
      return undefined;
    case "onlyWhenRunning":
      return state !== undefined && state?.length > 0 ? icon : undefined;
    case "onlyWhenNotRunning":
      return state === undefined || state?.length === 0 ? icon : undefined;
  }
};

export { formatMenuBarTitle, formatMenuBarIcon };
