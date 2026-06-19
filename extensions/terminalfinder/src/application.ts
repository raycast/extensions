import type { Application } from "@raycast/api";

type TerminalApplication = Pick<Application, "name" | "localizedName" | "bundleId">;

const KNOWN_BUNDLE_IDS = {
  cmux: "com.cmuxterm.app",
} as const;

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

export function findApplication<T extends TerminalApplication>(applications: T[], name: string): T | undefined {
  const knownBundleId = KNOWN_BUNDLE_IDS[name as keyof typeof KNOWN_BUNDLE_IDS];
  const normalizedName = normalize(name);

  const exactMatch = applications.find((app) => app.name === name || app.localizedName === name);
  if (exactMatch) {
    return exactMatch;
  }

  if (knownBundleId) {
    const bundleIdMatch = applications.find((app) => app.bundleId === knownBundleId);
    if (bundleIdMatch) {
      return bundleIdMatch;
    }
  }

  if (!normalizedName) {
    return undefined;
  }

  return applications.find((app) =>
    [app.name, app.localizedName, app.bundleId].some((value) => normalize(value) === normalizedName),
  );
}
