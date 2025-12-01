// Available NixOS branches/versions
export const AVAILABLE_BRANCHES = [
  { value: "unstable", title: "Unstable (rolling release)" },
  { value: "25.05", title: "NixOS 25.05" },
] as const;

// Elasticsearch query fields with their boost values
export const QUERY_FIELDS = [
  "package_attr_name^9",
  "package_attr_name.edge^9",
  "package_pname^6",
  "package_pname.edge^6",
  "package_attr_name_query^4",
  "package_attr_name_query.edge^4",
  "package_description^1.3",
  "package_description.edge^1.3",
  "package_longDescription^1",
  "package_longDescription.edge^1",
  "flake_name^0.5",
  "flake_name.edge^0.5",
  "package_attr_name_reverse^7.2",
  "package_attr_name_reverse.edge^7.2",
  "package_pname_reverse^4.800000000000001",
  "package_pname_reverse.edge^4.800000000000001",
  "package_attr_name_query_reverse^3.2",
  "package_attr_name_query_reverse.edge^3.2",
  "package_description_reverse^1.04",
  "package_description_reverse.edge^1.04",
  "package_longDescription_reverse^0.8",
  "package_longDescription_reverse.edge^0.8",
  "flake_name_reverse^0.4",
  "flake_name_reverse.edge^0.4",
] as const;

// Supported platforms to display
export const SUPPORTED_PLATFORMS = [
  "x86_64-linux",
  "aarch64-linux",
  "i686-linux",
  "x86_64-darwin",
  "aarch64-darwin",
] as const;

// API Configuration
export const API_CONFIG = {
  authorization: "Basic YVdWU0FMWHBadjpYOGdQSG56TDUyd0ZFZWt1eHNmUTljU2g=",
  versionUrl: "https://raw.githubusercontent.com/NixOS/nixos-search/main/version.nix",
  searchBaseUrl: "https://search.nixos.org/backend",
  githubBaseUrl: "https://github.com/NixOS/nixpkgs/blob/nixos-unstable",
} as const;

// Search Configuration
export const SEARCH_CONFIG = {
  minSize: 1,
  maxSize: 200,
  defaultSize: 20,
  tieBreaker: 0.7,
} as const;
