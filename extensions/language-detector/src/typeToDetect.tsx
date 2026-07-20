import { LaunchProps, Toast, showHUD } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { detectLanguage, getCachedDetector, getCachedModel } from "./utils.js";

type LaunchContext = {
  displayHUD?: boolean;
  callbackLaunchOptions?: LaunchOptions;
};

export default async function TypeToDetect({
  arguments: args,
  launchContext = {},
}: LaunchProps<{ arguments: Arguments.TypeToDetect; launchContext?: LaunchContext }>) {
  if (!args.content) return;
  const { displayHUD, callbackLaunchOptions } = launchContext;
  const detector = getCachedDetector();
  const model = getCachedModel();
  if (callbackLaunchOptions) {
    const { languageCode, languageName } = await detectLanguage(args.content, detector, model);
    if (displayHUD) await showHUD(languageName);
    callbackLaunchCommand(callbackLaunchOptions, { languageCode, languageName });
  } else {
    const toast = new Toast({ style: Toast.Style.Animated, title: "Detecting language..." });
    toast.show();
    const { languageName } = await detectLanguage(args.content, detector, model);
    toast.style = Toast.Style.Success;
    toast.title = "Detected language";
    toast.message = languageName;
  }
}
