import { ColorPaletteItem } from "../types";

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

export function groupColorsByCategory(colors: ColorPaletteItem[]): Map<string, ColorPaletteItem[]> {
  // First, sort the colors by name with number handling
  const sortedColors = [...colors].sort((a, b) => {
    const aName = a.name.includes("/") ? a.name.split("/")[1] : a.name;
    const bName = b.name.includes("/") ? b.name.split("/")[1] : b.name;
    return compareWithNumbers(aName, bName);
  });

  // Group colors by category
  const grouped = new Map<string, ColorPaletteItem[]>();

  sortedColors.forEach((color) => {
    const category = color.name.includes("/") ? color.name.split("/")[0] : "Unsorted";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)?.push(color);
  });

  // Convert to array, sort by category name, and convert back to Map
  const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  return new Map(sortedEntries);
}
