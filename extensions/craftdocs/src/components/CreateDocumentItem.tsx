import { Action, ActionPanel, List } from "@raycast/api";
import { buildCreateDocumentUrl } from "../lib/aiTools";

export default function CreateDocumentItem({ query, spaceID }: { query: string; spaceID: string }) {
  return (
    <List.Item
      title={`Create '${query}'`}
      detail={<List.Item.Detail markdown={`Create Document '${query}'`} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={buildCreateDocumentUrl(spaceID, query)} />
        </ActionPanel>
      }
    />
  );
}
