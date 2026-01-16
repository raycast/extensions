// Reusable progress indicator component
import { List } from "@raycast/api";
import { getProgressIcon } from "../../utils/uiHelpers";

interface ProgressItemProps {
  title: string;
  progress: number;
  current: number;
  goal: number;
  unit?: string;
  nutrientType: "calories" | "protein" | "carbs" | "fat";
  accessories?: List.Item.Accessory[];
}

export function ProgressItem({
  title,
  progress,
  current,
  goal,
  unit = "g",
  nutrientType,
  accessories = [],
}: ProgressItemProps) {
  const displayUnit = nutrientType === "calories" && unit === "g" ? "kcal" : unit;

  const defaultAccessories: List.Item.Accessory[] = [
    { text: `${Math.round(current)}${displayUnit} / ${Math.round(goal)}${displayUnit}` },
  ];

  return (
    <List.Item
      icon={getProgressIcon(progress, nutrientType)}
      title={title}
      accessories={[...defaultAccessories, ...accessories]}
    />
  );
}
