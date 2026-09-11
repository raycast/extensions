import { runPhiCommand } from "./command-compatibility";
import { newIncognitoSpace } from "./phi";
import { runWindowCommand } from "./window-command";

export default async function NewIncognitoSpace() {
  await runWindowCommand(
    () => runPhiCommand("new-incognito-space", newIncognitoSpace),
    "Opened New Incognito Space",
    "Could Not Open Incognito Space",
  );
}
