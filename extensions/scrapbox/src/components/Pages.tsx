import { ActionPanel, List, Action } from "@raycast/api";

export function Pages (props: {
  pages: [];
}) {
  return (
    <List>
      {props.pages?.map((page: any) => (
        <List.Item
          key={page.id}
          icon="list-icon.png"
          title={page.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={encodeURI(`https://scrapbox.io/zakuni/${page.title}`)}></Action.OpenInBrowser>
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
