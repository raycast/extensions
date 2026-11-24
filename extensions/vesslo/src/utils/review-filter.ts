import { VessloApp } from "../types";
import { isUpdatableApp } from "./update-filter";
import {
  activeManagementReasons,
  auditReviewSearchTerms,
  isActiveUpdateHealth,
} from "./audit-review";

export const REVIEW_CATEGORY_LABELS = {
  all: "All Reviews",
  security: "Security",
  source: "Update Sources",
  management: "Management",
} as const;

export type ReviewCategory = keyof typeof REVIEW_CATEGORY_LABELS;
export type ReviewScope = "all" | "updates";
export type AppReviewCategory = Exclude<ReviewCategory, "all">;

/** Display categories follow the existing audit review, never update authority. */
export function reviewCategories(app: VessloApp): AppReviewCategory[] {
  if (app.isDeleted) return [];
  const categories: AppReviewCategory[] = [];
  if (app.securityReasons.length > 0) categories.push("security");
  if (isActiveUpdateHealth(app)) {
    categories.push("source");
  }
  if (activeManagementReasons(app).length > 0) {
    categories.push("management");
  }
  return categories;
}

function searchableText(
  app: VessloApp,
  categories: AppReviewCategory[],
): string {
  const values = [
    app.name,
    app.bundleId,
    app.developer,
    app.memo,
    ...app.tags,
    ...app.auditGroups,
    ...auditReviewSearchTerms(app),
    ...categories.map((category) => REVIEW_CATEGORY_LABELS[category]),
  ].filter((value): value is string => value !== null);
  const raw = values.join("\n");
  return `${raw}\n${raw.replace(/([a-z])([A-Z])/g, "$1 $2")}`.toLowerCase();
}

export function filterReviewApps(
  apps: readonly VessloApp[],
  {
    category = "all",
    query = "",
    scope = "all",
  }: { category?: ReviewCategory; query?: string; scope?: ReviewScope } = {},
): VessloApp[] {
  const normalizedQuery = query.trim().toLowerCase();
  return apps
    .filter((app) => {
      const categories = reviewCategories(app);
      return (
        categories.length > 0 &&
        (scope === "all" || isUpdatableApp(app)) &&
        (category === "all" || categories.includes(category)) &&
        (!normalizedQuery ||
          searchableText(app, categories).includes(normalizedQuery))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
