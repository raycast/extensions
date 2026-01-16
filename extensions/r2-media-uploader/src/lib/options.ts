import type { BucketProfile, Preferences } from "./types";

export type BucketOption = {
  id: string;
  label: string;
  bucket: string;
  keyTemplate?: string;
  pathPrefix?: string;
  filenameTemplate?: string;
};

export type DomainOption = {
  id: string;
  label: string;
  value: string; // "r2" or a base URL like https://cdn.example.com
};

function parseCommaSeparatedList(input?: string): string[] {
  if (!input) return [];
  return input
    .split(/[,|\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed.replace(/\/+$/, "");
  return `https://${trimmed}`.replace(/\/+$/, "");
}

export function buildBucketOptions(params: { profiles: BucketProfile[]; prefs: Preferences }): BucketOption[] {
  const fromProfiles: BucketOption[] = params.profiles.map((p) => ({
    id: `profile:${p.name}`,
    label: `${p.name} (${p.bucket})`,
    bucket: p.bucket,
    keyTemplate: p.keyTemplate,
    pathPrefix: p.pathPrefix,
    filenameTemplate: p.filenameTemplate,
  }));

  const fromPrefs = parseCommaSeparatedList(params.prefs.bucketNames).map((b) => ({
    id: `bucket:${b}`,
    label: b,
    bucket: b,
  }));

  const seen = new Set<string>();
  const merged = [...fromProfiles, ...fromPrefs].filter((opt) => {
    const key = `${opt.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(opt.bucket);
  });

  return merged;
}

export function buildDomainOptions(params: { profiles: BucketProfile[]; prefs: Preferences }): DomainOption[] {
  const options: DomainOption[] = [{ id: "r2", label: "R2 Default URL", value: "r2" }];

  const fromProfiles = params.profiles
    .map((p) => p.publicBaseUrl)
    .filter(Boolean)
    .map((u) => normalizeBaseUrl(u as string));

  const fromPrefs = parseCommaSeparatedList(params.prefs.customDomains).map(normalizeBaseUrl);

  const single = params.prefs.customDomain ? [normalizeBaseUrl(params.prefs.customDomain)] : [];

  const all = [...single, ...fromProfiles, ...fromPrefs].filter(Boolean);
  const unique = Array.from(new Set(all));

  for (const u of unique) {
    options.push({ id: `domain:${u}`, label: u, value: u });
  }

  return options;
}

export function resolvePublicBaseUrl(params: {
  prefs: Pick<Preferences, "accountId">;
  bucket: string;
  domainValue: string;
}): string {
  if (!params.domainValue || params.domainValue === "r2") {
    return `https://${params.prefs.accountId}.r2.cloudflarestorage.com/${params.bucket}`;
  }
  return params.domainValue;
}
