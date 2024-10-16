import { Action, ActionPanel, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { Instance, Record } from "../types";

export default function ResultActions({ result, children }: { result: Record; children?: React.ReactNode }) {
  const [instance] = useCachedState<Instance>("instance");

  const instanceUrl = `https://${instance?.name}.service-now.com`;

  return (
    <>
      <ActionPanel.Section title={result.metadata.title}>
        <Action.OpenInBrowser
          title="Open in Servicenow"
          url={`${instanceUrl}${result.record_url}`}
          icon={{ source: "servicenow.svg" }}
        />
        {children}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy URL"
          content={`${instanceUrl}${result.record_url}`}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard
          title="Copy Title"
          content={`${result.metadata.title}`}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        {result.data.number && (
          <Action.CopyToClipboard
            title="Copy Number"
            content={result.data.number.display}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}
