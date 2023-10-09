import { List, ActionPanel, Action } from "@raycast/api";
import dataJSON from "./data.json";
import { getComponentUrl } from "./utils";

type dataType = {
  title?: string;
  order?: number;
  children: { title?: string; link?: string; frontmatter: { title?: string; subtitle?: string; cover?: string } }[];
};
const list: dataType[] = dataJSON;

export default function Command() {
  return (
    <List isShowingDetail>
      {list.map((item) => (
        <List.Section key={item.order} title={item.title}>
          {item.children.map((child) => {
            const title = `${child.frontmatter.title} ${child.frontmatter.subtitle || ""}`;
            return (
              <List.Item
                title={title}
                key={title}
                detail={
                  child.frontmatter.cover && (
                    <List.Item.Detail markdown={`![Illustration](${child.frontmatter.cover})`} />
                  )
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={getComponentUrl(child.link)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
