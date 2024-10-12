import { Action, ActionPanel } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { Instance } from "../hooks/useInstances";

export default function ResultActions({
  result,
  children,
}: {
  result: any;
  children?: React.ReactNode;
}) {
  const [instance] = useCachedState<Instance>("instance");

  const instanceUrl = `https://${instance?.name}.service-now.com`;

  return (
    <>
      <ActionPanel.Section title={result.metadata.title}>
        <Action.OpenInBrowser
          title="Open in ServiceNow"
          url={`${instanceUrl}${result.record_url}`}
          icon={{ source: "servicenow.svg" }}
        />
        {children}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy URL"
          content={`${instanceUrl}${result.record_url}`}
        />
        <Action.CopyToClipboard
          title="Copy Title"
          content={`${result.metadata.title}`}
        />
        {result.data.number && (
          <Action.CopyToClipboard
            title="Copy Number"
            content={result.data.number.display}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}
