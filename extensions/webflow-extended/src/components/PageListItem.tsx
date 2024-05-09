import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { Webflow } from "webflow-api";

export default function PageListItem(props: { siteSlug: string; page: Webflow.Page }) {
  const { page, siteSlug } = props;

  const name = page.title ?? "Untitled Page";

  return (
    <List.Item
      title={name}
      subtitle={"Page"}
      icon={Icon.Document}
      actions={
        <ActionPanel title={name}>
          <Action
            title="Open Page in Designer"
            icon={Icon.Link}
            onAction={() => {
              const url = `https://${siteSlug}.design.webflow.com/?pageId=${page.id}`;
              open(url);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
