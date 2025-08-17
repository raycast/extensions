import { LaunchProps, PopToRootType, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main(props: LaunchProps<{ arguments: Arguments.Capture }>) {
  const { content } = props.arguments;

  await runAppleScript(
    `
on run argv
  tell application "Drafts"
    make new draft with properties {content:argv, flagged:false}
  end tell
end run
  `,
    [content]
  );

  await showHUD("Created Draft 👍", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
