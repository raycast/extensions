import { ActionPanel, List, Action } from "@raycast/api";
import documentation from "./documentation/tailwind-ui";
import { groupBy, capitalize } from "lodash";

const uppercaseList = ["ui", "faq", "cta"];

function formatTitle(title: string) {
  return title
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => (uppercaseList.includes(word) ? word.toUpperCase() : capitalize(word)))
    .join(" ");
}

const entries = groupBy(
  documentation
    .filter((doc) => doc.loc.startsWith("https://tailwindui.com/components"))
    .map((doc) => ({
      title: formatTitle(doc.loc.split("/").at(-1) as string),
      section: formatTitle(doc.loc.split("/").at(-2) as string),
      category: formatTitle(doc.loc.split("/").at(-3) as string),
      url: doc.loc,
    })),
  (x) => x.category + "$$" + x.section,
);

export default function SearchDocumentation() {
  return (
    <List searchBarPlaceholder="Search by category, section or page...">
      {Object.entries(entries).map(([key, items]) => {
        const [category, section] = key.split("$$");
        return (
          <List.Section title={section} subtitle={category} key={key}>
            {items.map((item) => (
              <List.Item
                key={item.url}
                icon="tailwind-icon.png"
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
        );
      })}
    </List>
  );
}
