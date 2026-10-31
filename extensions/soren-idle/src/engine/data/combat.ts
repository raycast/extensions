import { AreaDef, DamageType } from "../types";

/** Creatures group into areas; each area's boss opens after enough kills among its hunts. */
export const AREAS: AreaDef[] = [
  {
    id: "canyon",
    name: "Canyon Floor",
    blurb: "Dust, heat and things that live under both.",
    hunts: ["fight_skitter", "fight_burrower"],
    boss: "fight_matriarch",
    bossKills: 25,
  },
  {
    id: "caves",
    name: "Cave Network",
    blurb: "Dark, wet and warmer than it should be.",
    hunts: ["fight_stalker", "fight_leech"],
    boss: "fight_broodking",
    bossKills: 40,
  },
  {
    id: "rift",
    name: "Rift Scar",
    blurb: "The ground is wrong here, and so is everything standing on it.",
    hunts: ["fight_wraith", "fight_hound"],
    boss: "fight_sovereign",
    bossKills: 40,
  },
];

/** Kinetic beats bio, bio beats energy, energy beats kinetic. */
export const BEATS: Record<DamageType, DamageType> = {
  kinetic: "bio",
  bio: "energy",
  energy: "kinetic",
};
