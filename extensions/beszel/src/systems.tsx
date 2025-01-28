import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { useListCollection } from "./hooks/use-list-collection";
import { System } from "./types/system";

import { useCallback, useMemo, useState } from "react";
import { SystemListItem } from "./components/SystemListItem";
import { EmptyListItem } from "./components/EmptListItem";

export default function Command() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data, isLoading, pagination } = useListCollection<System>("systems");

  const downSystems = useMemo(() => data.filter((sys) => sys.status === "down"), [data]);
  const upSystems = useMemo(() => data.filter((sys) => sys.status === "up"), [data]);

  const handleToggleDetailView = useCallback(() => {
    setIsShowingDetail(!isShowingDetail);
  }, [isShowingDetail]);

  return (
    <List
      navigationTitle="Beszel - Systems"
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchBarPlaceholder="Search Systems"
      pagination={pagination}
      actions={
        <ActionPanel>
          <Action title="Toggle Details" onAction={() => setIsShowingDetail(!isShowingDetail)} />
        </ActionPanel>
      }
    >
      <List.Section title="Up" subtitle={`${upSystems.length}`}>
        {upSystems.map((system) => (
          <SystemListItem
            key={system.id}
            isShowingDetail={isShowingDetail}
            onToggleDetail={handleToggleDetailView}
            system={system}
          />
        ))}
        {upSystems.length === 0 && (
          <EmptyListItem icon={Icon.Alarm} title="No system up and running, that's not great" />
        )}
      </List.Section>
      <List.Section title="Down" subtitle={`${downSystems.length}`}>
        {downSystems.map((system) => (
          <SystemListItem
            key={system.id}
            isShowingDetail={isShowingDetail}
            onToggleDetail={handleToggleDetailView}
            system={system}
          />
        ))}
        {downSystems.length === 0 && (
          <EmptyListItem icon={Icon.Checkmark} title="No system is down at the moment, that's great!" />
        )}
      </List.Section>
    </List>
  );
}
