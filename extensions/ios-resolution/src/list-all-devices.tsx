import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import devices from "./data/devices.json";
import { Device } from "./types";

const FAMILY_ICONS: Record<Device["family"], Icon> = {
  iPhone: Icon.Mobile,
  MacBook: Icon.Monitor,
  iPad: Icon.Window,
  "iPod touch": Icon.Music,
  "Apple Watch": Icon.Clock,
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DeviceListItem({ device }: { device: Device }) {
  return (
    <List.Item
      key={device.id}
      icon={FAMILY_ICONS[device.family]}
      title={device.name}
      keywords={[device.family, device.name]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Logical Resolution"
              content={`${device.logicalWidth}×${device.logicalHeight}`}
            />
            <Action.CopyToClipboard
              title="Copy Physical Resolution"
              content={`${device.physicalWidth}×${device.physicalHeight}`}
            />
            <Action.CopyToClipboard title="Copy PPI" content={String(device.ppi)} />
            <Action.CopyToClipboard title="Copy Scale Factor" content={String(device.scaleFactor)} />
            <Action.CopyToClipboard title="Copy Device Name" content={device.name} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy All">
            <Action.CopyToClipboard
              title="Copy All Info as JSON"
              content={JSON.stringify(device, null, 2)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Device" text={device.name} />
              <List.Item.Detail.Metadata.Label title="Family" text={device.family} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Logical Resolution"
                text={`${device.logicalWidth} × ${device.logicalHeight}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Physical Resolution"
                text={`${device.physicalWidth} × ${device.physicalHeight}`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="PPI" text={String(device.ppi)} />
              <List.Item.Detail.Metadata.Label title="Scale Factor" text={`${device.scaleFactor}x`} />
              <List.Item.Detail.Metadata.Label title="Screen Diagonal" text={device.screenDiagonal} />
              <List.Item.Detail.Metadata.Label title="Aspect Ratio" text={device.aspectRatio} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Release Date" text={formatDate(device.releaseDate)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

export default function Command() {
  const [showDetail] = useState(true);
  const [familyFilter, setFamilyFilter] = useState<string>("all");

  const sortedDevices = useMemo(() => {
    const filtered = familyFilter === "all" ? devices : devices.filter((d) => d.family === familyFilter);
    return [...filtered].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [familyFilter]);

  return (
    <List
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search devices..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Family" value={familyFilter} onChange={setFamilyFilter}>
          <List.Dropdown.Item title="All Devices" value="all" />
          <List.Dropdown.Item title="iPhone" value="iPhone" icon={Icon.Mobile} />
          <List.Dropdown.Item title="MacBook" value="MacBook" icon={Icon.Monitor} />
          <List.Dropdown.Item title="iPad" value="iPad" icon={Icon.Window} />
          <List.Dropdown.Item title="iPod touch" value="iPod touch" icon={Icon.Music} />
          <List.Dropdown.Item title="Apple Watch" value="Apple Watch" icon={Icon.Clock} />
        </List.Dropdown>
      }
    >
      {sortedDevices.map((device) => (
        <DeviceListItem key={device.id} device={device as Device} />
      ))}
    </List>
  );
}
