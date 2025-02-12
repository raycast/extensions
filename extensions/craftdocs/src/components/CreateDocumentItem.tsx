import { Action, ActionPanel, List } from "@raycast/api";

export default function CreateDocumentItem({ query, spaceID }: { query: string; spaceID: string }) {
  return (
    <List.Item
      title={`Create '${query}'`}
      detail={<List.Item.Detail markdown={`Create document '${query}'`} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`craftdocs://createdocument?spaceId=${spaceID}&title=${encodeURIComponent(query)}&content=&folderId=`}
          />
        </ActionPanel>
      }
    />
  );
}
