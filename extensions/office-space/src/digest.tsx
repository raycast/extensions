import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { hub } from "./lib/hub";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(() => hub<{ path: string; markdown: string }>(["digest"]));
  return (
    <Detail
      isLoading={isLoading}
      markdown={error ? `## Couldn't write the digest\n\n${error.message}` : (data?.markdown ?? "")}
      actions={
        <ActionPanel>
          {data && <Action.Open title="Open Digest File" icon={Icon.Document} target={data.path} />}
          {data && <Action.CopyToClipboard title="Copy as Markdown" content={data.markdown} />}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
