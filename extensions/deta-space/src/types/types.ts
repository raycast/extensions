export type Collection = {
  id: string;
  name: string;
  created_at: string;
  migrated?: boolean;
};

export type Instance = {
  id: string;
  app_id: string;
  release: {
    app_name: string;
    channel: "experimental" | "development";
    icon_url?: string;
    short_description?: string;
    id: string;
  };
  url: string;
};

export type Project = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Release = {
  id: string;
  name: string;
  short_description: string;
  release_alias: string;
  app_name: string;
  app_id: string;
  version: string;
  icon_url?: string;
  status: string;
  latest: boolean;
  released_at: string;
  discovery: {
    title?: string;
    tagline: string;
    theme_color: string;
    git?: string;
    homepage?: string;
    canonical_url: string;
    listed_url: string;
    stats: {
      total_installs: number;
      release_installs: string;
    };
    listed: boolean;
  };
};
