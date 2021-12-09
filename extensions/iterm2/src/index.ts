import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const openIterm = 'if application "iTerm" is running then\n\
tell application "iTerm"\n\
    create window with default profile\n\
end tell\n\
else\n\
activate application "iTerm"\n\
end if';

export default async () => {
  await closeMainWindow();
  await runAppleScript(openIterm);
}
