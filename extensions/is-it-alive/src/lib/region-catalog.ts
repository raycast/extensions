import type { SiteProvider } from "@/types";

export type CloudProvider = "aws";

const AWS_REGIONS = [
  "af-south-1",
  "ap-east-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ap-southeast-5",
  "ap-southeast-7",
  "ca-central-1",
  "ca-west-1",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "il-central-1",
  "me-central-1",
  "me-south-1",
  "mx-central-1",
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
] as const;

const REGION_CATALOG: Record<CloudProvider, readonly string[]> = {
  aws: AWS_REGIONS,
};

export function cloudProviderFromSiteProvider(
  provider: SiteProvider,
): CloudProvider | null {
  return provider === "aws" ? "aws" : null;
}

export function getRegionCatalog(provider: CloudProvider): string[] {
  return [...REGION_CATALOG[provider]];
}

export function sanitizeMonitoredRegions(
  provider: CloudProvider,
  regions: string[] | undefined,
): string[] {
  if (!regions?.length) {
    return [];
  }

  const catalog = new Set(getRegionCatalog(provider));
  return [...new Set(regions.filter((region) => catalog.has(region)))];
}

export function catalogRegionFromKey(
  provider: CloudProvider,
  value: string,
): string | undefined {
  const key = normalizeRegionLookupKey(value);
  return getRegionCatalog(provider).find(
    (region) => normalizeRegionLookupKey(region) === key,
  );
}

export function normalizeRegionLookupKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

export function resolveCatalogRegions(
  provider: CloudProvider,
  values: Iterable<string>,
): string[] {
  const resolved = new Set<string>();

  for (const value of values) {
    const region = catalogRegionFromKey(provider, value);
    if (region) {
      resolved.add(region);
    }
  }

  return [...resolved];
}
