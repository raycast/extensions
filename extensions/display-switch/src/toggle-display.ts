import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { controller, errorMessage } from "./backend";
import { resolveDisplay } from "./core";
export default async function Command({ arguments: args }: LaunchProps<{ arguments: { display: string } }>) {
  try {
    const displays = await controller.toggle(args.display);
    const display = resolveDisplay(displays, args.display);
    await showHUD(`${display.name} turned ${display.enabled ? "on" : "off"}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Toggle Display",
      message: errorMessage(error),
    });
  }
}
