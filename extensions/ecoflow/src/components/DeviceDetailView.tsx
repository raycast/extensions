import { Color, Detail, Icon } from "@raycast/api";
import { Fragment } from "react";
import { getApiSupportLabel, getDeviceCategory } from "../devices/catalog";
import type { DeviceSnapshot } from "../types/device";
import { getBatteryColor, powerFlowIcon, powerFlowLabel } from "../utils/device-ui";
import { getDeviceDetailGroups } from "../utils/device-details";
import { buildDeviceSummaryMarkdown } from "../utils/device-summary";
import { formatBatteryLevel } from "../utils/formatters";
import { DeviceActionPanel } from "./DeviceActionPanel";

export function DeviceDetailView({
  device,
  onRefresh,
}: {
  device: DeviceSnapshot;
  onRefresh: (() => void) | undefined;
}) {
  const detailGroups = getDeviceDetailGroups(device);
  const category = getDeviceCategory(device.profile.category);

  return (
    <Detail
      navigationTitle={device.name}
      markdown={buildDeviceSummaryMarkdown(device)}
      actions={<DeviceActionPanel device={device} onRefresh={onRefresh} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={device.online ? "Online" : "Offline"}
              color={device.online ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          {device.powerFlow !== "unknown" && (
            <Detail.Metadata.Label
              title="Power Flow"
              icon={powerFlowIcon(device.powerFlow)}
              text={powerFlowLabel(device.powerFlow)}
            />
          )}
          {device.batteryLevel !== undefined && (
            <Detail.Metadata.TagList title="Battery">
              <Detail.Metadata.TagList.Item
                text={formatBatteryLevel(device.batteryLevel)}
                color={getBatteryColor(device.batteryLevel)}
              />
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          {detailGroups.map((group, groupIndex) => (
            <Fragment key={group.id}>
              {groupIndex > 0 && <Detail.Metadata.Separator />}
              {group.rows.map((row) => (
                <Detail.Metadata.Label key={`${group.id}-${row.title}`} {...row} />
              ))}
            </Fragment>
          ))}

          {detailGroups.length > 0 && <Detail.Metadata.Separator />}

          <Detail.Metadata.Label title="Category" text={`${category.emoji} ${category.label}`} />
          <Detail.Metadata.Label title="Device Family" text={device.profile.displayName} />
          <Detail.Metadata.Label title="API Support" text={getApiSupportLabel(device.profile)} />
          <Detail.Metadata.Label title="Serial Number" text={device.serialNumber} />
          <Detail.Metadata.Label title="Raw Readings" text={String(Object.keys(device.quotas).length)} />
          {device.profile.documentationUrl && (
            <Detail.Metadata.Link
              title="Documentation"
              text="EcoFlow Developer Platform"
              target={device.profile.documentationUrl}
            />
          )}
          {device.quotaError && (
            <Detail.Metadata.Label
              title="Readings Error"
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              text={device.quotaError}
            />
          )}
        </Detail.Metadata>
      }
    />
  );
}
