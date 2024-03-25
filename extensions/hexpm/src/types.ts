export type Release = {
  has_docs: boolean;
  inserted_at: string;
  url: UrlString;
  version: PackageVersion;
};
type RFC3339 = string;
type UrlString = string;
type PackageVersion = string;
export type Package = {
  configs: {
    "erlang.mk": string;
    "mix.exs": string;
    "rebar.config": string;
  };
  docs_html_url: UrlString;
  downloads: {
    all: number;
    day: number;
    recent: number;
    week: number;
  };
  html_url: UrlString;
  inserted_at: RFC3339;
  latest_stable_version: PackageVersion;
  latest_version: PackageVersion;
  meta: {
    description: string;
    licenses: Array<string>;
    links: Record<string, UrlString>;
    maintainers: Array<string>;
  };
  name: string;
  releases: Array<Release>;
  repository: string;
  retirements: Record<
    PackageVersion,
    {
      message: string;
      reason: string;
    }
  >;
  updated_at: RFC3339;
  url: UrlString;
};
