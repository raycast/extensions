import { Grid } from "@raycast/api";
import { usePlayHistories } from "../helpers/nintendo";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { PlayHistoriesGridItem } from "./PlayHistoriesGridItem";
import { useState } from "react";
import { SessionTokenGuard } from "./SessionTokenGuard";
dayjs.extend(relativeTime);

const sortKeys = [
  { id: 1, name: "Most Played", value: "totalPlayedMinutes" },
  { id: 2, name: "Recently Played", value: "lastPlayedAt" },
] as const;
type TSortKeyValue = (typeof sortKeys)[number]["value"];

export const PlayHistoriesGrid = () => {
  const history = usePlayHistories();
  const [sortKey, setSortKey] = useState<TSortKeyValue>(sortKeys[0].value);

  const totalPlayTime = Math.floor(
    (history.data?.playHistories.reduce((a, b) => a + b.totalPlayedMinutes, 0) || 0) / 60
  );
  const gameRecords = history.data?.playHistories.length;
  const lastUpdate = dayjs(history.data?.lastUpdatedAt).format("YYYY-MM-DD HH:mm:ss");
  const sectionTitle = `${gameRecords} GAME · ${totalPlayTime} HOURS`;
  const sectionSubtitle = `Last update ${dayjs(lastUpdate).fromNow()}`;

  return (
    <Grid
      navigationTitle="All Play Histories"
      isLoading={history.isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Sort Key"
          storeValue
          onChange={(newValue) => setSortKey(newValue as TSortKeyValue)}
        >
          <Grid.Dropdown.Section title="Sort By">
            {sortKeys.map((key) => (
              <Grid.Dropdown.Item key={key.id} title={key.name} value={key.value} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <SessionTokenGuard type="grid">
        <Grid.Section title={sectionTitle} subtitle={sectionSubtitle}>
          {history.data?.playHistories
            .sort((a, b) => (a[sortKey] > b[sortKey] ? -1 : 1))
            .map((data) => (
              <PlayHistoriesGridItem data={data} />
            ))}
        </Grid.Section>
      </SessionTokenGuard>
    </Grid>
  );
};
