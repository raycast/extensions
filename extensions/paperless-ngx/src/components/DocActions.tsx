import { Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { DocItem } from "../models/docItem.model";

const { paperlessURL }: Preferences = getPreferenceValues();

export const DocActions = ({ document }: DocItem): JSX.Element => {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={`${paperlessURL}/documents/${document.id}`} title="Open in Editor" />
      <Action.OpenInBrowser url={`${paperlessURL}/documents/${document.id}/preview`} title="Open File in Browser" />
      <Action.CopyToClipboard
        content={`${paperlessURL}/documents/${document.id}/preview`}
        title="Copy File URL to Clipboard"
      />
    </ActionPanel>
  );
};
