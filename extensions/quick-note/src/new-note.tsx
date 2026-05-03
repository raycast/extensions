import { runAppleScript } from "run-applescript";
import { LaunchProps, closeMainWindow } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { title, content } = props.arguments;

  await closeMainWindow({ clearRootSearch: true });

  await runAppleScript(`
    tell application "Quick Note"
    	set n to make new note with properties {title:"${title}", content:"${content}"} source "raycast"
	    open n
    end tell
    `);
}
