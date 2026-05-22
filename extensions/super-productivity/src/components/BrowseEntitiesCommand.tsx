import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement } from "react";
import { assertAppReady } from "../lib/sp-client";
import { SetupEmptyView } from "../lib/ui";

export interface BrowseEntity {
  id: string;
  title: string;
  subtitle?: string;
}

interface BrowseEntitiesCommandProps<T extends BrowseEntity> {
  title: string;
  searchBarPlaceholder: string;
  loadItems: () => Promise<T[]>;
  emptyTitle: string;
  emptyDescription: string;
  getAccessories?: (item: T) => List.Item.Accessory[];
  getDetailTarget: (item: T) => ReactElement;
}

export function BrowseEntitiesCommand<T extends BrowseEntity>(
  props: BrowseEntitiesCommandProps<T>,
) {
  const { data, error, isLoading, revalidate } = usePromise(async () => {
    await assertAppReady();
    return props.loadItems();
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={props.searchBarPlaceholder}
    >
      {error ? (
        <SetupEmptyView error={error} />
      ) : (
        (data ?? []).map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Folder}
            title={item.title}
            subtitle={item.subtitle}
            accessories={props.getAccessories?.(item)}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`View ${props.title === "Show Tags" ? "Tasks" : "Project Tasks"}`}
                  icon={Icon.List}
                  target={props.getDetailTarget(item)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
      {!error && !isLoading && (data?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title={props.emptyTitle}
          description={props.emptyDescription}
        />
      ) : null}
    </List>
  );
}
