import { runPhiCommand } from "./command-compatibility";
import { newWindow } from "./phi";
import { runWindowCommand } from "./window-command";

export default async function NewWindow() {
  await runWindowCommand(
    () => runPhiCommand("new-window", newWindow),
    "Opened New Phi Window",
    "Could Not Open Window",
  );
}
