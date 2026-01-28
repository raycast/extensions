import { Action, Icon, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "../utils";

async function openInNewWindow(url: string) {
  const script = `
    tell application "${safariAppIdentifier}"
      set doc to make new document
      set URL of doc to "${url}"
      activate
    end tell
  `;

  await runAppleScript(script);
}

export default function OpenNewWindowAction(props: { url: string }) {
  return (
    <Action
      title="Open in New Window"
      icon={Icon.AppWindow}
      onAction={async () => {
        await closeMainWindow();
        await openInNewWindow(props.url);
      }}
    />
  );
}
