import {Action, ActionPanel, List} from "@raycast/api";

export default function CreateDocumentItem({query, spaceID}: { query: string; spaceID: string }) {
  return <List.Item
    title={`Create document '${query}'`}
    detail={
    <List.Item.Detail
      markdown="There is no document matching your search. Press enter to create one"
    />
  }
    actions={
      <ActionPanel>
        <Action.OpenInBrowser
          url={`craftdocs://createdocument?spaceId=${spaceID}&title=${encodeURIComponent(query)}&content=&folderId=`}
        />
      </ActionPanel>
    }
  />;
}