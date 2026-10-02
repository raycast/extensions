import type { SortOption } from "../constants";
import { VessloApp } from "../types";
import { AppPolicyContext } from "./app-policy";
import { resolveAppActions } from "./action-policy";
import { isUpdatableApp, updateRouteGroup } from "./update-filter";

export const UPDATE_FILTER_LABELS = {
  all: "All Updates",
  homebrew: "Homebrew",
  sparkle: "Sparkle",
  appStore: "App Store",
  manual: "Manual Installer",
  review: "Needs Review",
} as const;

export type UpdateFilter = keyof typeof UPDATE_FILTER_LABELS;

export function filterUpdates(
  apps: readonly VessloApp[],
  context: AppPolicyContext,
  {
    filter = "all",
    query = "",
    sortBy = "source",
  }: { filter?: UpdateFilter; query?: string; sortBy?: SortOption } = {},
): VessloApp[] {
  const normalizedQuery = query.trim().toLowerCase();
  const visible = apps.filter((app) => {
    if (!isUpdatableApp(app)) return false;
    const policy = resolveAppActions(app, context);
    if (
      filter !== "all" &&
      (filter === "review"
        ? policy.update.kind !== "review"
        : updateRouteGroup(app) !== filter)
    ) {
      return false;
    }
    return (
      !normalizedQuery ||
      [
        app.name,
        app.bundleId,
        app.developer,
        app.version,
        app.targetVersion,
        app.homebrewCask,
        app.path,
        app.memo,
        ...app.tags,
        ...app.sources,
        policy.reviewReason,
        UPDATE_FILTER_LABELS[updateRouteGroup(app)],
      ].some((value) => value?.toLowerCase().includes(normalizedQuery))
    );
  });
  if (sortBy === "nameDesc") {
    return visible.sort(
      (a, b) => b.name.localeCompare(a.name) || a.id.localeCompare(b.id),
    );
  }
  if (sortBy === "developer") {
    return visible.sort(
      (a, b) =>
        (a.developer ?? "").localeCompare(b.developer ?? "") ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
  }
  return visible.sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}
