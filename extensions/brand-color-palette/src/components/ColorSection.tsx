import { Grid } from "@raycast/api";
import { ColorSectionProps } from "../types";
import { ColorItem } from "./ColorItem";

function compareWithNumbers(a: string, b: string): number {
  // Extract the base name and number suffix
  const aMatch = a.match(/^(.+?)(?:-(\d+))?$/);
  const bMatch = b.match(/^(.+?)(?:-(\d+))?$/);

  if (!aMatch || !bMatch) return a.localeCompare(b);

  const [, aName, aNumber] = aMatch;
  const [, bName, bNumber] = bMatch;

  // First compare the names
  const nameComparison = aName.localeCompare(bName);
  if (nameComparison !== 0) return nameComparison;

  // If names are the same, compare numbers
  const aNum = aNumber ? parseInt(aNumber, 10) : 0;
  const bNum = bNumber ? parseInt(bNumber, 10) : 0;
  return aNum - bNum;
}

export function ColorSection({ title, colors, tokenMode, onUpdate }: ColorSectionProps) {
  // Sort colors by name within the section, handling numeric suffixes
  const sortedColors = [...colors].sort((a, b) => {
    const aName = a.name.includes("/") ? a.name.split("/")[1] : a.name;
    const bName = b.name.includes("/") ? b.name.split("/")[1] : b.name;
    return compareWithNumbers(aName, bName);
  });

  return (
    <Grid.Section
      title={title}
      subtitle={`${colors.length} color${colors.length === 1 ? "" : "s"}`}
      columns={8}
      aspectRatio="1"
    >
      {sortedColors.map((color) => (
        <ColorItem key={color.name} color={color} onUpdate={onUpdate} tokenMode={tokenMode} />
      ))}
    </Grid.Section>
  );
}
