import { runAppleScript } from "run-applescript";
import { LaunchProps, closeMainWindow } from "@raycast/api";
import { escaped } from "./utils";

// Arguments interface
interface CommandArguments {
  title?: string;
  content?: string;
}

export default async function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { title, content } = props.arguments;

  await closeMainWindow({ clearRootSearch: true });

  await runAppleScript(`
    tell application "Quick Note"
    	set n to make new note with properties {title:"${escaped(title)}", content:"${escaped(content)}"} source "raycast"
	    open n
    end tell
    `);
}
