import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { controller, errorMessage } from "./backend";
import { resolveDisplay, displayWarnings } from "./core";
export default async function Command({ arguments: args }: LaunchProps<{ arguments: { display: string } }>) {
  try {
    const displays = await controller.toggle(args.display);
    const display = resolveDisplay(displays, args.display);
    const title = `${display.name} turned ${display.enabled ? "on" : "off"}`;
    const warning = displayWarnings(displays);
    if (warning) await showToast({ style: Toast.Style.Success, title, message: warning });
    else await showHUD(title);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Toggle Display",
      message: errorMessage(error),
    });
  }
}
