import { List } from "@raycast/api";
import { Command, ThinkingKeyword } from "../../../types";
import { getBadgeProps } from "../../Badge";
import { isCommand } from "../../../utils";

export function createItemAccessories(item: Command | ThinkingKeyword): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  let badge;
  if (isCommand(item)) {
    // Command type
    const hasWarning = item.warning === true;
    const isDeprecated = item.deprecated === true;
    const isNew = item.isNew === true;
    const badgeType = isDeprecated ? "deprecated" : hasWarning ? "warning" : isNew ? "new" : undefined;
    if (badgeType) {
      badge = getBadgeProps({ type: badgeType });
    }
  } else {
    // ThinkingKeyword type
    const keyword = item as ThinkingKeyword;
    badge = getBadgeProps({
      type: "budget",
      budget: keyword.budget,
      tokens: keyword.tokens,
    });
  }

  if (badge) {
    accessories.push({
      text: badge.text,
      ...(badge.icon && { icon: badge.icon as string }),
      ...(badge.color && { color: badge.color }),
    });
  }

  return accessories;
}
