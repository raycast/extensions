import { List, ActionPanel, Action } from "@raycast/api";
import dataJSON from "./data.json";
import { getComponentUrl } from "./utils";

type dataType = {
  title?: string;
  children: { title?: string; link?: string; frontmatter: { title?: string; cover?: string } }[];
};
const list: dataType[] = dataJSON;

export default function Command() {
  return (
    <List isShowingDetail>
      {list.map((item) => (
        <List.Section key={item.title} title={item.title}>
          {item.children.map((child) => (
            <List.Item
              title={`${child.title} ${child.frontmatter.title || ""}`}
              key={child.title}
              detail={
                child.frontmatter.cover && <List.Item.Detail markdown={`![Illustration](${child.frontmatter.cover})`} />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={getComponentUrl(child.link)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
