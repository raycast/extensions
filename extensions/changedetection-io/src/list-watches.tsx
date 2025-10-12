import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { validUrl, useWatches } from "@/api";
import CreateWatch from "@/screens/CreateWatch";
import { WatchItem } from "@/components/WatchItem";

const ListWatches = () => {
  if (!validUrl()) {
    return (
      <Detail
        markdown={"# Error \n\n Invalid URL"}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const { sort_by, sort_order } = getPreferenceValues<Preferences.ListWatches>();
  const { isLoading, data, error, revalidate, mutate } = useWatches({ sortBy: sort_by, sortOrder: sort_order });

  return (
    <List isLoading={isLoading}>
      {!isLoading && !error && (
        <List.EmptyView
          title="No website watches configured."
          description="Create new watch."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Watch" target={<CreateWatch onCreate={revalidate} />} />
            </ActionPanel>
          }
        />
      )}
      {data.unseen.length > 0 ? (
        <List.Section title="Unseen">
          {data.unseen.map((watch) => {
            return <WatchItem key={watch.id} watch={watch} mutate={mutate} revalidate={revalidate} />;
          })}
        </List.Section>
      ) : null}
      {data.seen.length > 0 ? (
        <List.Section title="Seen">
          {data.seen.map((watch) => {
            return <WatchItem key={watch.id} watch={watch} mutate={mutate} revalidate={revalidate} />;
          })}
        </List.Section>
      ) : null}
    </List>
  );
};

export default ListWatches;
