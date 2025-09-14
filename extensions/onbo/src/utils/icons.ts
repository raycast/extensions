import { Color, Icon } from "@raycast/api";
import { ApplicationStatus } from "./roles";

const CATEGORY_ICON: Record<string, Icon> = {
  "Software Engineering": Icon.Code,
  "Hardware Engineering": Icon.Hammer,
  "Data Science, AI & Machine Learning": Icon.BarChart,
  "Product Management": Icon.Box,
  "Quantitative Finance": Icon.Calculator,
};

export function getIconForCategory(category: string): Icon {
  const normalized = category.replace(/\s*Internship Roles$/, "").trim();
  return CATEGORY_ICON[normalized] ?? Icon.CodeBlock;
}

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
