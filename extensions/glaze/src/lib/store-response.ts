import type { StoreApp, StoreOrganization } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nullableText(value: unknown): value is string | null | undefined {
  return value == null || typeof value === "string";
}

export function parseStoreApps(value: unknown): {
  data: StoreApp[];
  hasMore: boolean;
} {
  if (
    !isRecord(value) ||
    !Array.isArray(value.apps) ||
    typeof value.hasMore !== "boolean" ||
    !value.apps.every(
      (app: unknown) =>
        isRecord(app) &&
        typeof app.id === "string" &&
        !!app.id &&
        typeof app.public_id === "string" &&
        typeof app.display_name === "string" &&
        [
          app.description,
          app.full_description,
          app.icon_url,
          app.latest_version,
          app.category,
        ].every(nullableText) &&
        (app.profiles == null ||
          (isRecord(app.profiles) &&
            typeof app.profiles.username === "string" &&
            nullableText(app.profiles.display_name))),
    )
  )
    throw new Error(
      "Unexpected Glaze Store response. Try refreshing the store.",
    );
  return { data: value.apps, hasMore: value.hasMore };
}

export function parseStoreOrganizations(value: unknown): StoreOrganization[] {
  if (!isRecord(value) || !Array.isArray(value.organizations))
    throw new Error(
      "Unexpected Glaze account response. Try refreshing your team stores.",
    );
  return value.organizations
    .filter(
      (org: unknown): org is StoreOrganization =>
        isRecord(org) &&
        typeof org.id === "string" &&
        !!org.id &&
        typeof org.name === "string" &&
        !!org.name &&
        typeof org.slug === "string" &&
        nullableText(org.avatar_url) &&
        (org.teamStoreAccess == null ||
          (isRecord(org.teamStoreAccess) &&
            org.teamStoreAccess.canInstallFromStore === true)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
