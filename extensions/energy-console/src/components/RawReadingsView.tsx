import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { listRawReadings } from "../api/quotas";
import { getDeviceCategory } from "../devices/catalog";
import type { DeviceSnapshot, RawReading } from "../types/device";
import { formatQuotaValue, humanizeQuotaKey } from "../utils/formatters";

export function RawReadingsView({ device }: { device: DeviceSnapshot }) {
  const readings = listRawReadings(device.quotas);
  const useful = readings.filter((reading) => reading.relevance > 0);
  const other = readings.filter((reading) => reading.relevance === 0);

  return (
    <List
      searchBarPlaceholder="Search reading names and values..."
      navigationTitle={`${getDeviceCategory(device.profile.category).emoji} ${device.name} Readings`}
    >
      {useful.length > 0 && (
        <List.Section title="Useful Readings" subtitle={String(useful.length)}>
          {useful.map((reading) => (
            <ReadingItem key={reading.key} reading={reading} />
          ))}
        </List.Section>
      )}
      {other.length > 0 && (
        <List.Section title="Other Readings" subtitle={String(other.length)}>
          {other.map((reading) => (
            <ReadingItem key={reading.key} reading={reading} />
          ))}
        </List.Section>
      )}
      {readings.length === 0 && (
        <List.EmptyView
          icon={Icon.Gauge}
          title="No Readings Available"
          description={device.quotaError ?? "EcoFlow returned no quota values for this device."}
        />
      )}
    </List>
  );
}

function ReadingItem({ reading }: { reading: RawReading }) {
  const value = formatQuotaValue(reading.value);

  return (
    <List.Item
      icon={reading.relevance > 0 ? Icon.Gauge : Icon.Dot}
      title={humanizeQuotaKey(reading.key)}
      subtitle={reading.key}
      accessories={[{ text: value }]}
      keywords={[reading.key, value]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Value" icon={Icon.CopyClipboard} content={value} />
          <Action.CopyToClipboard title="Copy Reading" icon={Icon.CopyClipboard} content={`${reading.key}=${value}`} />
        </ActionPanel>
      }
    />
  );
}
