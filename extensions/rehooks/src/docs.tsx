import { OpenInBrowserAction } from "./components/actions";
import { ActionPanel, List } from "@raycast/api";
import { DOCS_PAGES } from "./lib/constants";

export default function Command() {
  return (
    <>
      <List>
        {DOCS_PAGES.map((item, index) => (
          <List.Item
            key={index}
            title={item.title}
            detail={item.description}
            subtitle={item.description}
            keywords={[item.title]}
            actions={
              <ActionPanel>
                <OpenInBrowserAction title={item.title} url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    </>
  );
}
