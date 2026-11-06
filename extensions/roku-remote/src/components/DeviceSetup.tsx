import { Action, ActionPanel, Icon, List } from "@raycast/api";
import ManageDevices, { AddDeviceForm } from "../manage-devices";
import type { RokuDevice } from "../lib/types";

type SetupProps = {
  devices: RokuDevice[];
  isLoading: boolean;
  error?: string;
  choose: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function DeviceDropdown({
  devices,
  selectedId,
  choose,
}: Pick<SetupProps, "devices" | "choose"> & { selectedId?: string }) {
  return (
    <List.Dropdown tooltip="Choose a Roku TV" value={selectedId ?? ""} onChange={(id) => void choose(id)}>
      {!selectedId ? <List.Dropdown.Item value="" title="Choose a TV" /> : null}
      {devices.map((device) => (
        <List.Dropdown.Item key={device.id} value={device.id} title={device.name} />
      ))}
    </List.Dropdown>
  );
}

export function DeviceSetup({ devices, isLoading, error, choose, reload }: SetupProps) {
  return (
    <List isLoading={isLoading} navigationTitle="Choose a Roku TV" searchBarPlaceholder="Search saved TVs…">
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={error ? "Couldn't load saved TVs" : "Add your Roku TV"}
        description={error ?? "Discover TVs on your network, or add one by its IP address."}
        actions={
          <ActionPanel>
            <Action.Push
              title="Discover TVs"
              icon={Icon.MagnifyingGlass}
              target={<ManageDevices discoverOnOpen onChanged={reload} />}
            />
            <Action.Push
              title="Add TV by IP Address"
              icon={Icon.Plus}
              target={<AddDeviceForm useAsDefault={devices.length === 0} onChanged={reload} />}
            />
            {error ? <Action title="Try Again" onAction={reload} icon={Icon.ArrowClockwise} /> : null}
          </ActionPanel>
        }
      />
      {devices.length > 0 ? (
        <List.Section title="Choose the TV you want to control" subtitle="This selection becomes your default TV">
          {devices.map((device) => (
            <List.Item
              key={device.id}
              title={device.name}
              subtitle={device.model}
              icon={Icon.Desktop}
              accessories={[{ text: device.host }]}
              actions={
                <ActionPanel>
                  <Action title="Use This TV" icon={Icon.Checkmark} onAction={() => choose(device.id)} />
                  <Action.Push title="Manage TVs" icon={Icon.Gear} target={<ManageDevices onChanged={reload} />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
