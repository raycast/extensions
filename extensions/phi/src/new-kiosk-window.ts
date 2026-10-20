import { LaunchProps } from "@raycast/api";
import { runPhiCommand } from "./command-compatibility";
import { newKioskWindow } from "./phi";
import { runWindowCommand } from "./window-command";

export default async function NewKioskWindow(
  props: LaunchProps<{ arguments: Arguments.NewKioskWindow }>,
) {
  await runWindowCommand(
    () =>
      runPhiCommand("new-kiosk-window", () =>
        newKioskWindow(props.arguments.url),
      ),
    "Opened New Kiosk Window",
    "Could Not Open Kiosk Window",
  );
}
