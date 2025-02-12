import { ActionPanel, List, Action } from "@raycast/api";
import docs from "./docs.json";
import { groupBy, capitalize } from "lodash";

const uppercaseList = ["ui", "faq", "api", "cli", "db"];

const FormatTitle = (title: string) => {
  return title
    .replace(/-/g, " ")
    .split(" ")
    .map((word: string) => (uppercaseList.includes(word) ? word.toUpperCase() : capitalize(word)))
    .join(" ");
};

const entries = groupBy(
  docs.urlset.url
    .filter((doc, index, self) => self.findIndex((t) => t.loc === doc.loc) === index)
    .filter((doc) => doc.loc.startsWith("https://supabase.com"))
    .map((doc) => ({
      title: FormatTitle(doc.loc.split("/").at(-1) as string),
      section: FormatTitle(doc.loc.split("/").at(-2) as string),
      url: doc.loc,
    })),
  (x) => x.section
);

const SearchDocumentation = () => {
  return (
    <List>
      {Object.entries(entries).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="supabase-logo.png"
              title={item.title}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};

export default SearchDocumentation;
