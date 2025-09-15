import { Color, Icon } from "@raycast/api";
import { ApplicationStatus } from "./roles";

/**
 * Maps known category names to Raycast icons for list items.
 * Unknown categories fall back to Icon.CodeBlock.
 */
const CATEGORY_ICON: Record<string, Icon> = {
  "Software Engineering": Icon.Code,
  "Hardware Engineering": Icon.Hammer,
  "Data Science, AI & Machine Learning": Icon.BarChart,
  "Product Management": Icon.Box,
  "Quantitative Finance": Icon.Calculator,
};

/**
 * Resolves a display icon for a given category, stripping "Internship Roles" suffix.
 *
 * @param category - Raw category name from API.
 * @returns Icon representing the category.
 */
export function getIconForCategory(category: string): Icon {
  const normalized = category.replace(/\s*Internship Roles$/, "").trim();
  return CATEGORY_ICON[normalized] ?? Icon.CodeBlock;
}

/**
 * Returns an icon configuration for a given ApplicationStatus.
 * Some statuses include a tinted color for visual emphasis.
 *
 * @param status - Current application status.
 * @returns Icon descriptor to use in list items.
 */
export const getStatusIcon = (status: ApplicationStatus) => {
  switch (status) {
    case "saved":
      return { source: Icon.Bookmark };
    case "applied":
      return { source: Icon.Circle };
    case "interviewing":
      return { source: Icon.Clock, tintColor: Color.Yellow };
    case "offer":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "rejected":
      return { source: Icon.XMarkCircle };
    default:
      return { source: Icon.Dot };
  }
};
