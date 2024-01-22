import { ActionPanel, List, Action } from "@raycast/api";
import documentation, { type Page } from "./lib/noroffApiIndex";

type Props = {
  item: Page;
  section: string;
};

const DocumentationItem = ({ item, section }: Props) => (
  <List.Item
    key={item.url}
    icon="noroff-logo-emblem.png"
    title={item.title}
    keywords={[item.title, section]}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={item.url} />
        <Action.CopyToClipboard content={item.url} />
      </ActionPanel>
    }
  />
);

const SearchDocumentation = () => (
  <List>
    {Object.entries(documentation).map(([section, items]) => (
      <List.Section key={section} title={section}>
        {items.map((item) => (
          <DocumentationItem key={item.url} item={item} section={section} />
        ))}
      </List.Section>
    ))}
  </List>
);

export default SearchDocumentation;
