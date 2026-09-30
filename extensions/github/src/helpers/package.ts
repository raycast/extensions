import { Color, Icon, Image } from "@raycast/api";

/** The API requires an explicit `package_type`, so "all packages" means querying each one. */
export const PACKAGE_TYPES = ["container", "npm", "maven", "docker", "nuget", "rubygems"] as const;

export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PACKAGES_PER_PAGE = 100;
export const PACKAGES_MAX_PAGES = 5;

export type Package = {
  id: number;
  name: string;
  package_type: PackageType;
  visibility: string;
  /** GitHub documents this as required, but it is missing from some container packages. */
  version_count?: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  owner?: { login: string; avatar_url: string } | null;
  repository?: { full_name: string; html_url: string } | null;
};

export type PackageVersion = {
  id: number;
  name: string;
  html_url?: string;
  package_html_url: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    container?: { tags?: string[] } | null;
    docker?: { tag?: string[] } | null;
  } | null;
};

const PACKAGE_TYPE_TITLES: Record<PackageType, string> = {
  container: "Container",
  npm: "npm",
  maven: "Maven",
  docker: "Docker",
  nuget: "NuGet",
  rubygems: "RubyGems",
};

const PACKAGE_TYPE_COLORS: Record<PackageType, Color> = {
  container: Color.Blue,
  npm: Color.Red,
  maven: Color.Orange,
  docker: Color.SecondaryText,
  nuget: Color.Purple,
  rubygems: Color.Magenta,
};

export function getPackageTypeTitle(packageType: PackageType): string {
  return PACKAGE_TYPE_TITLES[packageType] ?? packageType;
}

export function getPackageIcon(packageType: PackageType): Image.ImageLike {
  return { source: Icon.Box, tintColor: PACKAGE_TYPE_COLORS[packageType] ?? Color.PrimaryText };
}

export function isPrivatePackage(pkg: Package): boolean {
  return pkg.visibility === "private";
}

export function getPackageVersionCount(pkg: Package): number | undefined {
  return typeof pkg.version_count === "number" ? pkg.version_count : undefined;
}

export function sortPackagesByUpdatedAt(packages: Package[]): Package[] {
  return [...packages].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
}

export type PackageSection = {
  packageType: PackageType;
  title: string;
  packages: Package[];
};

export function groupPackagesByType(packages: Package[]): PackageSection[] {
  return PACKAGE_TYPES.flatMap((packageType) => {
    const packagesOfType = packages.filter((pkg) => pkg.package_type === packageType);

    if (packagesOfType.length === 0) {
      return [];
    }

    return [{ packageType, title: getPackageTypeTitle(packageType), packages: packagesOfType }];
  });
}

/** The two registries publish tags under different metadata keys. */
export function getPackageVersionTags(version: PackageVersion): string[] {
  return version.metadata?.container?.tags ?? version.metadata?.docker?.tag ?? [];
}

/** Accepts both the bare name and the `owner/name` form the list view shows. */
export function findPackageByName(packages: Package[], name: string): Package | undefined {
  const normalized = name.trim().toLowerCase();

  if (normalized.length === 0) {
    return undefined;
  }

  // A spelled-out owner has to match too, or `acme/my-pkg` would resolve to your own.
  const matches = normalized.includes("/")
    ? packages.filter((pkg) => pkg.repository?.full_name?.toLowerCase() === normalized)
    : packages.filter((pkg) => pkg.name.toLowerCase() === normalized);

  return groupPackagesByType(matches)[0]?.packages[0];
}

/** Mirrors GitHub's own abbreviation: 36151958 -> "36.2M". */
export function formatDownloadCount(count: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(count);
}
