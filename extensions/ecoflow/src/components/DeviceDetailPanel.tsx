import { Color, Icon, List } from "@raycast/api";
import { Fragment } from "react";
import { getApiSupportLabel, getDeviceCategory } from "../devices/catalog";
import type { DeviceSnapshot } from "../types/device";
import { getBatteryColor, powerFlowLabel } from "../utils/device-ui";
import { getDeviceDetailGroups } from "../utils/device-details";
import { buildDeviceSummaryMarkdown } from "../utils/device-summary";
import { formatBatteryLevel } from "../utils/formatters";

export function DeviceDetailPanel({ device }: { device: DeviceSnapshot }) {
  const detailGroups = getDeviceDetailGroups(device);
  const category = getDeviceCategory(device.profile.category);

  return (
    <List.Item.Detail
      markdown={buildDeviceSummaryMarkdown(device)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={device.online ? "Online" : "Offline"}
              color={device.online ? Color.Green : Color.SecondaryText}
            />
            {device.powerFlow !== "unknown" && (
              <List.Item.Detail.Metadata.TagList.Item
                text={powerFlowLabel(device.powerFlow)}
                color={device.powerFlow === "charging" ? Color.Green : Color.SecondaryText}
              />
            )}
          </List.Item.Detail.Metadata.TagList>

          {device.batteryLevel !== undefined && (
            <List.Item.Detail.Metadata.TagList title="Battery">
              <List.Item.Detail.Metadata.TagList.Item
                text={formatBatteryLevel(device.batteryLevel)}
                color={getBatteryColor(device.batteryLevel)}
              />
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Separator />

          {detailGroups.map((group, groupIndex) => (
            <Fragment key={group.id}>
              {groupIndex > 0 && <List.Item.Detail.Metadata.Separator />}
              {group.rows.map((row) => (
                <List.Item.Detail.Metadata.Label key={`${group.id}-${row.title}`} {...row} />
              ))}
            </Fragment>
          ))}

          {detailGroups.length > 0 && <List.Item.Detail.Metadata.Separator />}

          <List.Item.Detail.Metadata.Label title="Category" text={`${category.emoji} ${category.label}`} />
          <List.Item.Detail.Metadata.Label title="Family" text={device.profile.displayName} />
          <List.Item.Detail.Metadata.Label title="API Support" text={getApiSupportLabel(device.profile)} />
          <List.Item.Detail.Metadata.Label title="Serial Number" text={device.serialNumber} />
          <List.Item.Detail.Metadata.Label title="Readings" text={String(Object.keys(device.quotas).length)} />
          {device.profile.documentationUrl && (
            <List.Item.Detail.Metadata.Link
              title="Documentation"
              text="EcoFlow Developer Platform"
              target={device.profile.documentationUrl}
            />
          )}
          {device.quotaError && (
            <List.Item.Detail.Metadata.Label
              title="Readings Error"
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              text={device.quotaError}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
