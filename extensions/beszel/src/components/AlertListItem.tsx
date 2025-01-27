import { Color, Icon, List } from "@raycast/api";

import type { Alert } from "../types/alert";
import { renderAlertCondition } from "../utils/alerts";

const mapAlertTargetToIcon: Record<Alert["name"], string> = {
  Status: Icon.Power,
  CPU: Icon.ComputerChip,
  Memory: Icon.MemoryChip,
  Disk: Icon.HardDrive,
  Temperature: Icon.Temperature,
  Bandwidth: Icon.Network,
};

/**
 *
 * @param target
 * @param isTriggered
 * @param triggeredColor
 * @param notTriggeredColor
 * @returns ImageLike
 */
export const getAlertIndicatorIcon = (
  target: string,
  isTriggered = false,
  triggeredColor = Color.Red,
  notTriggeredColor = Color.Green,
) => {
  const icon = mapAlertTargetToIcon[target] || Icon.Dot;

  if (isTriggered) {
    return { source: icon, tintColor: triggeredColor };
  }

  return { source: icon, tintColor: notTriggeredColor };
};

export function AlertListItem({ alert, keywords }: { alert: Alert; keywords?: string[] }) {
  return (
    <List.Item
      id={alert.id}
      title={alert.name}
      keywords={keywords}
      subtitle={renderAlertCondition(alert)}
      accessories={alert.triggered ? [{ date: new Date(alert.updated) }] : []}
      icon={getAlertIndicatorIcon(alert.name, alert.triggered)}
    />
  );
}
