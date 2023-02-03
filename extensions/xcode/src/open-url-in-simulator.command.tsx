import { XcodeSimulatorService } from "./services/xcode-simulator.service";
import { Clipboard, LaunchProps } from "@raycast/api";

interface OpenSimulatorArguments {
  url?: string;
  udid?: string;
}

export default async (
  props: LaunchProps<{ arguments: OpenSimulatorArguments }>
) =>
  XcodeSimulatorService.openUrl(
    props.arguments.url ?? (await Clipboard.readText()),
    undefined
  );
