import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { discoverDesks, DiscoveredDesk, getDeskId, selectDesk } from "./desk";

async function loadDesks() {
  const [desks, selectedId] = await Promise.all([discoverDesks(6) as Promise<DiscoveredDesk[]>, getDeskId()]);
  return { desks, selectedId };
}

export default function SelectDesk() {
  const { data, isLoading, revalidate, mutate } = usePromise(loadDesks, [], {
    failureToastOptions: { title: "Couldn't search for desks" },
  });
  const hasPreference = !!getPreferenceValues<Preferences>().uuid?.trim();

  async function choose(desk: DiscoveredDesk) {
    if (hasPreference) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Desk identifier preference is set",
        message: "Clear it in the extension preferences to use the selected desk.",
        primaryAction: { title: "Open Extension Preferences", onAction: openExtensionPreferences },
      });
      return;
    }
    await mutate(selectDesk(desk.id), {
      optimisticUpdate: (current) => ({ desks: current?.desks ?? [], selectedId: desk.id }),
      shouldRevalidateAfter: false,
    });
    await showToast({ title: `Selected ${desk.name}` });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter desks">
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Searching for desks…" : "No desks found"}
        description="Hold the Bluetooth button on your desk controller until the light blinks, then search again."
        actions={
          <ActionPanel>
            <Action title="Search Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {data?.desks.map((desk) => {
        const isSelected = desk.id === data.selectedId;
        return (
          <List.Item
            key={desk.id}
            title={desk.name}
            subtitle={desk.id}
            icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            accessories={[
              ...(desk.connected ? [{ tag: { value: "Connected", color: Color.Green } }] : []),
              ...(desk.rssi !== undefined && desk.rssi !== null
                ? [{ text: `${desk.rssi} dBm`, tooltip: "Signal" }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Select Desk" icon={Icon.Check} onAction={() => choose(desk)} />
                <Action
                  title="Search Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action.CopyToClipboard title="Copy Desk Identifier" content={desk.id} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
