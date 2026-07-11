import { Color, Icon, List } from "@raycast/api";
import { Jar } from "../../types";
import { getProgressIcon } from "@raycast/utils";
import { formatCurrency } from "../common";

export function getJarAccessories(jar: Jar): List.Item.Accessory[] {
  const progress = jar.balance / jar.goal;
  const percentage = (progress * 100).toFixed(2);

  if (!jar.goal) return [{ text: "No goal" }];

  const progressIcon =
    progress < 1 ? getProgressIcon(progress, Color.Green) : { source: Icon.CheckCircle, tintColor: Color.Green };

  return [{ text: formatCurrency(jar.goal, jar.currency.code) }, { icon: progressIcon, tooltip: `${percentage}%` }];
}
