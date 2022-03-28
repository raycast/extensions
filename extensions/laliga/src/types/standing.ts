export interface LaLigaStanding {
  standings: Standing[];
}

export interface Standing {
  played: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: string;
  position: number;
  previous_position: number;
  difference_position: number;
  team: Team;
}

export interface Team {
  id: number;
  slug: string;
  name: string;
  nickname: string;
  boundname: string;
  shortname: string;
  sprite_status: SpriteStatus;
  shield: Shield;
  competitions: any[];
}

export interface Shield {
  id: number;
}

export enum SpriteStatus {
  Created = "created",
}
