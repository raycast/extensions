import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { resources } from "../data/resources";

export default function Command() {
  const res = resources();

  const groupedResources = res.reduce(
    (acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section].push(item);
      return acc;
    },
    {} as Record<string, typeof res>,
  );

  const sortedSections = Object.keys(groupedResources).sort((a, b) => {
    if (a === "featured") return -1;
    if (b === "featured") return 1;
    return a.localeCompare(b);
  });

  return (
    <List isLoading={false}>
      {sortedSections.map((section) => (
        <List.Section key={section} title={section.charAt(0).toUpperCase() + section.slice(1)}>
          {groupedResources[section].map((item) => (
            <List.Item
              key={item.name}
              icon={Icon.Link}
              title={item.name}
              subtitle={item.description}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title={"Open Link"} icon={Icon.Link} url={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
