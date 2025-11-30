export function normalizeTagName(tagName: string): string {
  return tagName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w-]/g, "") // Remove special characters except hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

export const TAG_COLORS = [
  { name: "Blue", color: "#3B82F6" },
  { name: "Green", color: "#10B981" },
  { name: "Red", color: "#EF4444" },
  { name: "Yellow", color: "#F59E0B" },
  { name: "Purple", color: "#8B5CF6" },
  { name: "Pink", color: "#EC4899" },
  { name: "Gray", color: "#6B7280" },
  { name: "Orange", color: "#F97316" },
  { name: "Brown", color: "#92400E" },
  { name: "Cyan", color: "#06B6D4" },
];
