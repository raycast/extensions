import { PropsWithChildren, useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { SortBy } from "@/types";
import { validInstanceUrl } from "@/utils";
import { useWatches } from "@/hooks/use-watches";
import CreateWatch from "@/screens/CreateWatch";
import { ErrorGuard } from "@/components/ErrorGuard";
import { SortingDropDown } from "@/components/SortingDropDown";
import { WatchItem } from "@/components/WatchItem";

const WithOptionalSection = ({ title, children }: PropsWithChildren<{ title: string | null }>) =>
  title ? <List.Section title={title}>{children}</List.Section> : children;

const ListWatches = () => {
  const [sortBy, setSortBy] = useState<SortBy>("none");
  const isValidInstanceUrl = useMemo(() => validInstanceUrl(), []);

  const { isLoading, data, error, revalidate, mutate } = useWatches({ sortBy, execute: isValidInstanceUrl });
  const extensionError = isValidInstanceUrl ? error : new Error("Invalid URL");

  // If we only have one section, we don't need to use separate section titles
  const needsSection = data.unseen.length > 0 && data.seen.length > 0;

  return (
    <ErrorGuard error={extensionError}>
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
    </ErrorGuard>
  );
};

export default ListWatches;
