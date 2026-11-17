import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import { BlipIncompatibleError, BlipNotRunningError } from "../lib/client";
import { isMac } from "../lib/endpoint";

export function BlipErrorView({ error }: { error: Error }) {
  const title =
    error instanceof BlipNotRunningError
      ? "Can't reach Blip"
      : error instanceof BlipIncompatibleError
        ? "Blip changed"
        : "Something went wrong";

  const markdown = [
    `# ${title}`,
    error.message,
    error instanceof BlipNotRunningError ? "Make sure Blip is installed, signed in and running, then try again." : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {isMac && <Action title="Open Blip" icon={Icon.AppWindow} onAction={() => open("/Applications/Blip.app")} />}
          <Action.OpenInBrowser title="Get Blip" url="https://blip.net" />
          <Action.CopyToClipboard title="Copy Error" content={error.message} />
        </ActionPanel>
      }
    />
  );
}
