import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { DeviceDetailView } from "./components/DeviceDetailView";
import { DeviceListItem } from "./components/DeviceListItem";
import { EmptyView } from "./components/EmptyView";
import { useDeviceProperties } from "./hooks/useDeviceProperties";
import { useDevices } from "./hooks/useDevices";
import { escapeMarkdownInline } from "./utils/formatters";

interface DeviceDetailArguments {
  device?: string;
}

export default function DeviceDetailCommand(props: { arguments: DeviceDetailArguments }) {
  const identifier = props.arguments.device?.trim();
  return identifier ? <DirectDevice identifier={identifier} /> : <DevicePicker />;
}

function DirectDevice({ identifier }: { identifier: string }) {
  const { data: device, error, isLoading, revalidate } = useDeviceProperties(identifier);

  if (device) return <DeviceDetailView device={device} onRefresh={() => void revalidate()} />;
  if (isLoading) return <Detail isLoading />;

  return (
    <Detail
      markdown={`# Could Not Open Device\n\n${escapeMarkdownInline(error?.message ?? "The device was not found.")}`}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => void revalidate()} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function DevicePicker() {
  const { data = [], error, isLoading, revalidate } = useDevices();
  const refresh = () => void revalidate();

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search devices...">
      {data.map((device) => (
        <DeviceListItem key={device.serialNumber} device={device} onRefresh={refresh} />
      ))}
      {data.length === 0 && <EmptyView isLoading={isLoading} error={error} onRetry={refresh} />}
    </List>
  );
}
