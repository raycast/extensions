import { LaunchProps, Toast, showHUD } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { detectLanguage } from "./utils.js";

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
  if (callbackLaunchOptions) {
    const { languageCode, languageName } = await detectLanguage(args.content);
    if (displayHUD) await showHUD(languageName);
    callbackLaunchCommand(callbackLaunchOptions, { languageCode, languageName });
  } else {
    const toast = new Toast({ style: Toast.Style.Animated, title: "Detecting language..." });
    toast.show();
    const { languageName } = await detectLanguage(args.content);
    toast.style = Toast.Style.Success;
    toast.title = "Detected language";
    toast.message = languageName;
  }
}
