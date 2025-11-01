export default interface ProjectAPIResponseType {
  client_side: string;
  server_side: string;
  game_versions: string[];
  id: string;
  slug: string;
  project_type: string;
  team: string;
  organization: string;
  title: string;
  description: string;
  body: string;
  published: string;
  updated: string;
  license: License;
  downloads: string;
  followers: string;
  categories: string[];
  additional_categories: string[];
  loaders: string[];
  versions: string[];
  icon_url: string;
  issues_url: string;
  source_url: string;
  wiki_url: string;
  discord_url: string;
  donation_urls: Donation[];
  gallery: Image[];
}

export interface License {
  id: string;
  name: string;
  url: string;
}

export interface Donation {
  id: string;
  platform: string;
  url: string;
}

export interface Image {
  url: string;
  raw_url: string;
  featured: boolean;
  title: string;
  description: string;
  created: string;
  ordering: number;
}
