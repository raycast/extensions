export default interface ModChangelogAPIResponse {
  game_versions: string[];
  loaders: string[];
  id: string;
  project_id: string;
  author_id: string;
  featured: boolean;
  name: string;
  version_number: string;
  changelog: string;
  changelog_url: string | null;
  date_published: string;
  downloads: number;
  version_type: string;
  status: string;
  requested_status: string | null;
  files: VersionFile[];
  dependencies: Dependency[];
}

export interface VersionFile {
  hashes: {
    sha1: string;
    sha512: string;
  };
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  file_type: string | null;
}

export interface Dependency {
  version_id: string | null;
  project_id: string;
  file_name: string | null;
  dependency_type: string;
}
