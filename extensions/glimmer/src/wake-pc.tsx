import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listPCs } from "./lib/glimmer";
import { ErrorView, ignoreErrorToast, NoPCs, openGlimmer, stateAccessory, wakeWithToast } from "./components/shared";

export default function WakePC() {
  const { data, error, isLoading, revalidate } = useCachedPromise(listPCs, [], { onError: ignoreErrorToast });
  if (error) return <ErrorView error={error} refresh={revalidate} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search PCs…">
      {!data?.length && !isLoading ? <NoPCs /> : null}
      {data?.map((pc) => (
        <List.Item
          key={pc.id}
          title={pc.name}
          icon={Icon.Desktop}
          accessories={[stateAccessory(pc)]}
          actions={
            <ActionPanel>
              <Action title="Wake PC" icon={Icon.Power} onAction={() => wakeWithToast(pc, revalidate)} />
              <Action title="Refresh PCs" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Glimmer" icon="extension-icon.png" onAction={openGlimmer} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
