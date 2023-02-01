import { XcodeSimulatorService } from "./services/xcode-simulator.service";
import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";

interface OpenSimulatorArguments {
  url?: string;
}

export default async (props: { arguments: OpenSimulatorArguments }) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening URL in Simulator...",
  });
  try {
    const url = props.arguments.url ?? (await Clipboard.readText());
    if (!url) throw Error("Please provide or copy a valid URL.");
    const result = await XcodeSimulatorService.openUrl(url);
    toast.style = Toast.Style.Success;
    toast.title = "URL opened in Simulator.";
    XcodeSimulatorService.showSimulator();
    await new Promise((r) => setTimeout(r, 1500));
    await closeMainWindow();
    return {
      isSuccess: true,
      result: result,
      toast: toast,
    };
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Error while opening URL in Simulator.";
    toast.message = `${error}`;
    return {
      isSuccess: false,
      toast: toast,
    };
  }
};
