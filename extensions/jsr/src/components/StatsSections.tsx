import { List } from "@raycast/api";

import type { StatsData } from "@/types";

import { packageToSearchResultDocument } from "@/lib/convert";

import ListItem from "@/components/ListItem";

type StatsSectionsProps = {
  statsData?: StatsData;
  enabled: boolean;
};

const StatsSections = ({ statsData, enabled }: StatsSectionsProps) => {
  if (!statsData || !enabled) {
    return null;
  }
  return (
    <>
      <List.Section title="Featured">
        {statsData.featured.map((result) => (
          <ListItem
            key={`featured/${result.scope ?? "unknown"}/${result.name ?? "unknown"}`}
            item={packageToSearchResultDocument(result)}
          />
        ))}
      </List.Section>
      <List.Section title="Newest">
        {statsData.newest.map((result) => (
          <ListItem
            key={`newest/${result.scope ?? "unknown"}/${result.name ?? "unknown"}`}
            item={packageToSearchResultDocument(result)}
          />
        ))}
      </List.Section>
    </>
  );
};

export default StatsSections;
