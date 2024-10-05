import { showHUD, LaunchProps } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main(props: LaunchProps<{ arguments: Arguments.QuickCapture }>) {
  const { content } = props.arguments;

  const res = await runAppleScript(
  `
on run argv
  tell application "Drafts"
    make new draft with properties {content:argv, flagged:false}
  end tell
end run
  `,
      [content],
    );

  await showHUD(res);
  
}