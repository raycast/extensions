import { XcodeSimulatorService } from "./services/xcode-simulator.service";
import {
  Clipboard,
  closeMainWindow,
  showToast,
  Toast,
  LaunchProps,
} from "@raycast/api";
import { XcodeService } from "./services/xcode.service";

interface OpenSimulatorArguments {
  url?: string;
}

export default async (
  props: LaunchProps<{ arguments: OpenSimulatorArguments }>
) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening URL in Simulator",
  });
  try {
    await checkPreconditions();
    const url = (props.arguments.url ?? (await Clipboard.readText())).trim();
    await checkUrlValidity(url);
    await XcodeSimulatorService.openUrl(url);
    toast.style = Toast.Style.Success;
    toast.title = "URL opened in Simulator.";
    XcodeSimulatorService.showSimulator();
    await closeMainWindow();
  } catch (error) {
    console.error(error);
    const defaultTitle = "Error while opening URL in Simulator.";
    toast.style = Toast.Style.Failure;
    toast.title =
      error instanceof Error ? error.message ?? defaultTitle : defaultTitle;
  }
};

async function checkPreconditions() {
  if (!(await XcodeService.isXcodeInstalled()))
    throw Error("Xcode is not installed");
  if (!(await XcodeSimulatorService.existsBootedSimulator()))
    throw Error("No booted Simulator found.");
}

async function checkUrlValidity(url: string | undefined) {
  if (!url) throw Error("URL provided is empty.");
  const regex = /\w+:\/\/[^\s]+/;
  if (!regex.test(url)) throw Error("URL provided has wrong format.");
}
