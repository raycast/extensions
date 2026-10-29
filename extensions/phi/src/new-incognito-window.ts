import { runPhiCommand } from "./command-compatibility";
import { newIncognitoWindow } from "./phi";
import { runWindowCommand } from "./window-command";

export default async function NewIncognitoWindow() {
  await runWindowCommand(
    () => runPhiCommand("new-incognito-window", newIncognitoWindow),
    "Opened New Incognito Window",
    "Could Not Open Incognito Window",
  );
}
