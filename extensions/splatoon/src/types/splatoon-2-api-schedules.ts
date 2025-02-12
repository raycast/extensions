export type Response = Record<Mode["key"], Schedule[]>;

export interface Schedule {
  end_time: number;
  game_mode: Mode;
  id: number;
  rule: Rule;
  stage_a: Stage;
  stage_b: Stage;
  start_time: number;
}

export interface Mode {
  key: "gachi" | "league" | "regular";
  name: "League Battle" | "Ranked Battle" | "Regular Battle";
}

export interface Rule {
  key: "clam_blitz" | "rainmaker" | "splat_zones" | "tower_control" | "turf_war";
  multiline_name: "Clam\nBlitz" | "Rainmaker" | "Splat\nZones" | "Tower\nControl" | "Turf\nWar";
  name: "Clam Blitz" | "Rainmaker" | "Splat Zones" | "Tower Control" | "Turf War";
}

export interface Stage {
  id: string;
  image: string;
  name: string;
}
