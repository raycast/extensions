import { PropsWithChildren, useState } from "react";
import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { SortBy } from "@/types";
import { validInstanceUrl } from "@/utils";
import { useWatches } from "@/hooks/use-watches";
import CreateWatch from "@/screens/CreateWatch";
import { SortingDropDown } from "@/components/SortingDropDown";
import { WatchItem } from "@/components/WatchItem";

const WithOptionalSection = ({ title, children }: PropsWithChildren<{ title: string | null }>) =>
  title ? <List.Section title={title}>{children}</List.Section> : children;

const ListWatches = () => {
  if (!validInstanceUrl()) {
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

  const [sortBy, setSortBy] = useState<SortBy>("none");
  const { isLoading, data, error, revalidate, mutate } = useWatches({ sortBy });

  // If we only have one section, we don't need to use separate section titles
  const needsSection = data.unseen.length > 0 && data.seen.length > 0;

  return (
    <List isLoading={isLoading} searchBarAccessory={<SortingDropDown setSortBy={setSortBy} />}>
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
        <WithOptionalSection title={needsSection ? "Unseen" : null}>
          {data.unseen.map((watch) => {
            return <WatchItem key={watch.id} watch={watch} mutate={mutate} revalidate={revalidate} />;
          })}
        </WithOptionalSection>
      ) : null}
      {data.seen.length > 0 ? (
        <WithOptionalSection title={needsSection ? "Seen" : null}>
          {data.seen.map((watch) => {
            return <WatchItem key={watch.id} watch={watch} mutate={mutate} revalidate={revalidate} />;
          })}
        </WithOptionalSection>
      ) : null}
    </List>
  );
};

export default ListWatches;
