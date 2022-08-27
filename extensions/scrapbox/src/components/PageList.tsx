import { ActionPanel, List, Action } from "@raycast/api";
import { Page } from "../types";

export function PageList(props: { project: string; pages?: Page[] | null }) {
  const { project, pages } = props;

  return (
    <List isLoading={!pages}>
      {pages?.map((page: Page) => (
        <List.Item
          key={page.id}
          icon="list-icon.png"
          title={page.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={encodeURI(`https://scrapbox.io/${project}/${page.title}`)}
              ></Action.OpenInBrowser>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
