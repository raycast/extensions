import {
  Icon,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  popToRoot,
  showHUD,
  closeMainWindow,
  showToast,
} from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { Preferences } from "./types";
import { existsSync, writeFileSync } from "node:fs";

const shortCircuitMenuBar = <T>(state: T[] | undefined, prefs: Preferences): boolean => {
  return (
    (state == undefined || state.length == 0 || state.length == undefined) &&
    !["always", "onlyWhenNotRunning"].includes(prefs.showMenuBarIconWhen)
  );
};

const showHudOrToast = (args: { msg: string; launchedFromMenuBar: boolean; isErr: boolean }) => {
  if (args.isErr) return showError(new Error(args.msg), { title: "Timer Error" });
  const prefs: Preferences = getPreferenceValues();
  if (args.launchedFromMenuBar || prefs.closeWindowOnTimerStart) {
    showHUD(`🎉 ${args.msg}`);
    return prefs.closeWindowOnTimerStart ? closeMainWindow() : popToRoot();
  } else {
    return showToast({ style: Toast.Style.Success, title: args.msg });
  }
};

const showInitialRingContinuouslyWarning = async (): Promise<boolean> => {
  const RINGCONTINUOUSLY_SHOWN_PATH = environment.supportPath + "/ringContinuouslyWarningShown";
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.ringContinuously) return true;
  if (existsSync(RINGCONTINUOUSLY_SHOWN_PATH)) return true;

  const result = await confirmAlert({
    title: "Ring Continuously is enabled!",
    icon: Icon.Bell,
    message:
      'When the timer rings, use "Dismiss Ringing Timer", "Stop Running Timer", or stop it in "Manage Timers" to dismiss the sound. You can configure this in your Raycast settings.',
  });
  if (result) writeFileSync(RINGCONTINUOUSLY_SHOWN_PATH, "");
  return result;
};

export { shortCircuitMenuBar, showHudOrToast, showInitialRingContinuouslyWarning };
