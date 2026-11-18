import * as Types from "@ui/types";
import { Color, Icon, List } from "@raycast/api";
import { GetAccessorySeverity } from "@ui/components/accessory";

export function ItemAccessory(
  item: Types.DataHostsView,
  selectedZabbixServer?: string,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  /* Zabbix Server Name*/
  if (selectedZabbixServer && selectedZabbixServer.toLowerCase() === "all")
    accessories.push({ icon: Icon.Building, tag: item.server_name });

  /* Problems */
  if (item.triggers) {
    const problems: number[] = [0, 0, 0, 0, 0, 0];

    /* Count Problems by Severity */
    for (const trigger of item.triggers) {
      if (!trigger.status || !trigger.value || !trigger.priority) continue;

      /* Count only if Trigger is enabled and in Problem status */
      if (trigger.status === "0" && trigger.value === "1")
        problems[Number(trigger.priority)] += 1;
    }

    /* Push Accessory */
    for (const [severity, counter] of problems.entries()) {
      if (counter === 0) continue;
      const a = GetAccessorySeverity(severity, String(counter));
      if (a) accessories.push(a);
    }
  }

  /* Interfaces */
  if (item.interfaces?.length) {
    const type: string[] = ["Agent", "SNMP", "IPMI", "JMX"];
    const colors = [Color.SecondaryText, Color.Green, Color.Red];
    const icons = [Icon.QuestionMark, Icon.Plug, Icon.CircleDisabled];
    for (const i of item.interfaces) {
      if (
        !i.type ||
        Number(i.type) > 4 ||
        Number(i.type) < 1 ||
        !i.available ||
        !i.port ||
        !i.useip
      )
        continue;

      /* Value: Type */
      const value = type.at(Number(i.type) - 1);

      /* Color, Icon: Availability */
      const color = colors.at(Number(i.available));
      const icon = icons.at(Number(i.available));

      /* Tooltip: DNS or IP */
      let tooltip = "";
      if (i.useip === "0" && i.dns) tooltip = i.dns;
      else if (i.ip) tooltip = i.ip;
      if (tooltip !== "" && i.port !== "") tooltip += `:${i.port}`;

      /* Push Accessory */
      accessories.push({
        tag: { value: value, color: color },
        icon: icon,
        tooltip: tooltip,
      });
    }
  }

  /* Status */
  if (item.status && item.status === "1")
    accessories.push({
      tag: { value: "", color: Color.SecondaryText },
      icon: Icon.CircleDisabled,
      tooltip: "Disabled",
    });

  /* Maintenance */
  if (item.maintenance_status === "1")
    accessories.push({
      tag: { value: "", color: Color.Orange },
      icon: Icon.WrenchScrewdriver,
      tooltip: "In Maintenance",
    });

  return accessories;
}
