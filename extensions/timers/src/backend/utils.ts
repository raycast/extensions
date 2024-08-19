import { Toast, getPreferenceValues, popToRoot, showHUD, showToast } from "@raycast/api";
import { Preferences } from "./types";

const shortCircuitMenuBar = <T>(state: T[] | undefined, prefs: Preferences): boolean => {
  return (
    (state == undefined || state.length == 0 || state.length == undefined) &&
    !["always", "onlyWhenNotRunning"].includes(prefs.showMenuBarIconWhen)
  );
};

const showHudOrToast = (args: { msg: string; launchedFromMenuBar: boolean; isErr: boolean }) => {
  const prefs: Preferences = getPreferenceValues();
  if (args.launchedFromMenuBar || prefs.closeWindowOnTimerStart) {
    const msgEmoji = args.isErr ? "⚠️" : "🎉";
    showHUD(`${msgEmoji} ${args.msg}`);
    return popToRoot();
  } else {
    showToast({ style: args.isErr ? Toast.Style.Failure : Toast.Style.Success, title: args.msg });
  }
};

export { shortCircuitMenuBar, showHudOrToast };
