export type CharacterData = {
  name: string;
  race: string;
  class: string;
  active_spec_name: string;
  active_spec_role: string;
  gender: string;
  faction: string;
  achievment_points: number;
  thumbnail_url: string;
  region: string;
  realm: string;
  last_crawled_at: string;
  profile_url: string;
  profile_banner: string;
  mythic_plus_scores_by_season: Array<{
    season: string;
    scores: {
      all: number;
      dps: number;
      healer: number;
      tank: number;
      spec_0: number;
      spec_1: number;
      spec_2: number;
      spec_3: number;
    };
    segments: {
      all: {
        score: number;
        color: string;
      };
      dps: {
        score: number;
        color: string;
      };
      healer: {
        score: number;
        color: string;
      };
      tank: {
        score: number;
        color: string;
      };
      spec_0: {
        score: number;
        color: string;
      };
      spec_1: {
        score: number;
        color: string;
      };
      spec_2: {
        score: number;
        color: string;
      };
      spec_3: {
        score: number;
        color: string;
      };
    };
  }>;
  mythic_plus_ranks: {
    overall: {
      world: number;
      region: number;
      realm: number;
    };
    class: {
      world: number;
      region: number;
      realm: number;
    };
    tank?: {
      world: number;
      region: number;
      realm: number;
    };
    class_tank?: {
      world: number;
      region: number;
      realm: number;
    };
    dps?: {
      world: number;
      region: number;
      realm: number;
    };
    class_dps?: {
      world: number;
      region: number;
      realm: number;
    };
  };
  mythic_plus_recent_runs: Array<{
    dungeon: string;
    short_name: string;
    mythic_level: number;
    completed_at: string;
    clear_time_ms: number;
    par_time_ms: number;
    num_keystone_upgrades: number;
    map_challenge_mode_id: number;
    zone_id: number;
    zone_expansion_id: number;
    icon_url: string;
    background_image_url: string;
    score: number;
    affixes: Array<{
      id: number;
      name: string;
      description: string;
      wowhead_url: string;
      icon_url: string;
      icon: string;
    }>;
    url: string;
  }>;
  raid_progression: Record<
    string,
    {
      summary: string;
      expansion_id: number;
      total_bosses: number;
      normal_bosses_killed: number;
      heroic_bosses_killed: number;
      mythic_bosses_killed: number;
    }
  >;
};
