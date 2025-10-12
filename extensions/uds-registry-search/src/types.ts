export interface CatalogPackage {
  repo: string;
  title: string;
  description: string;
  architectures: string[];
  categories?: string;
  flavors?: string[];
  icon?: string;
  latest_tag: string;
  size?: number;
  tag_count?: number;
  tagline?: string;
  last_build?: string;
  last_updated?: string;
  url?: string;
  readme?: string;
}

export interface PackageWithOrg extends CatalogPackage {
  orgName: string;
}

export interface CatalogOrg {
  org: string;
  org_custom_name?: string;
  public_metadata?: boolean;
  repos: CatalogPackage[];
  updated?: string;
}

export interface CatalogResponse {
  authenticated: boolean;
  catalog: {
    [orgName: string]: CatalogOrg;
  };
}

export interface PackageTag {
  sort?: number;
  name: string;
  architecture: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
  kind?: string;
  zarf_data?: {
    kind?: string;
    version: string;
    flavor?: string;
    components?: Array<{
      name: string;
      description?: string;
      required?: boolean;
      charts?: string[];
    }>;
  };
  cve_status?: string;
  cve_summary?: {
    total_critical?: number;
    total_high?: number;
    total_medium?: number;
    total_low?: number;
    total_negligible?: number;
    total_unknown?: number;
  };
}

export interface PackageMetadata {
  tags: PackageTag[];
}

export interface Preferences {
  registryUrl?: string;
  sessionCookie?: string;
  ignorePublic?: boolean;
  ignoreAirgapStore?: boolean;
}
