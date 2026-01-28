import { Action, ActionPanel, Keyboard } from "@raycast/api";

import { ReactNode } from "../../node_modules/@raycast/api/node_modules/@types/react/index";
import { Record } from "../types";
import useInstances from "../hooks/useInstances";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";

export default function ResultActions({ result, children }: { result: Record; children?: ReactNode }) {
  const { selectedInstance } = useInstances();

  const url = buildServiceNowUrl(selectedInstance?.name || "", result.record_url);

  return (
    <>
      <ActionPanel.Section title={result.metadata.title}>
        <Action.OpenInBrowser title="Open in ServiceNow" url={url} icon={{ source: "servicenow.svg" }} />
        {children}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyPath} />
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
