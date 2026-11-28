import { VessloApp } from "../types";

/** Deleted records stay searchable without regaining installed-app actions. */
export function deletedRecords(
  apps: readonly VessloApp[],
  query = "",
): VessloApp[] {
  const needle = query.trim().toLocaleLowerCase();
  return apps
    .filter(
      (app) =>
        app.isDeleted &&
        (!needle ||
          [
            app.name,
            app.bundleId,
            app.developer,
            app.path,
            app.memo,
            ...app.tags,
          ]
            .filter((value): value is string => typeof value === "string")
            .some((value) => value.toLocaleLowerCase().includes(needle))),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        a.path.localeCompare(b.path) ||
        a.id.localeCompare(b.id),
    );
}
