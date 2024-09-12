export interface index {
  name: string;
  index: string;
  level?: number;
  url: string;
}

export interface indexCollection {
  count: number;
  results: index[];
}

export interface spell {
  index: string;
  name: string;
  desc: string[];
  higher_level: string[];
  range: string;
  components: string[];
  material?: string;
  ritual: boolean;
  duration: string;
  concentration: boolean;
  casting_time: string;
  level: number;
  attack_type?: string;
  damage?: {
    damage_type: {
      index: string;
      name: string;
      url: string;
    };
    damage_at_character_level?: Record<string, string>;
    damage_at_slot_level?: Record<string, string>;
  };
  heal_at_slot_level?: Record<string, string>;
  school: {
    index: string;
    name: string;
    url: string;
  };
  classes: {
    index: string;
    name: string;
    url: string;
  }[];
  subclasses: {
    index: string;
    name: string;
    url: string;
  }[];
  url: string;
}

export interface rule {
  index: string;
  name?: string;
  rule?: string;
  desc?: string | string[];
  url?: string;
}

export interface monster {
  index: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  armor_class: { type: string; value: number }[];
  hit_points: number;
  hit_dice: string;
  hit_points_roll: string;
  speed: { walk: string; swim: string };
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencies: { value: number; proficiency: { index: string; name: string; url: string } }[];
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: {
    index: string;
    name: string;
    url: string;
  }[];
  senses: { darkvision: string; passive_perception: number };
  languages: string;
  challenge_rating: number;
  proficiency_bonus: number;
  xp: number;
  special_abilities: {
    name: string;
    desc: string;
    dc?: { dc_type: { index: string; name: string; url: string }; dc_value: number; success_type: string };
  }[];
  actions: {
    name: string;
    multiattack_type?: string;
    desc: string;
    actions: { action_name: string; count: number; type: string }[];
    attack_bonus?: number;
    dc?: { dc_type: { index: string; name: string; url: string }; dc_value: number; success_type: string };
    damage: {
      damage_type: { index: string; name: string; url: string };
      damage_dice: string;
    }[];
  }[];
  legendary_actions: {
    name: string;
    desc: string;
    attack_bonus?: number;
    damage?: { damage_type: { index: string; name: string; url: string }; damage_dice: string }[];
  }[];
  image: string;
  url: string;
}
