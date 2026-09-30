export interface Schedule {
  detail?: string;
  games: Game[];
  mode: Mode;
}

export interface Game {
  from: Date;
  mode: Mode;
  rule: Rule;
  stages: Stage[];
  to: Date;
}

export interface Mode {
  icon?: string;
  name: string;
  wiki?: string;
}

export interface Rule {
  icon?: string;
  name: string;
  wiki?: string;
}

export interface Stage {
  image?: string;
  name: string;
}
