import { Icon } from "@raycast/api";
import { SkillId } from "../engine/types";

export const EAT_LEVELS: [number, string][] = [
  [0, "Only When Needed"],
  [0.25, "Below 25% HP"],
  [0.5, "Below 50% HP"],
  [0.75, "Below 75% HP"],
];

export const RUN_CHOICES = [1, 5, 10, 25, 100];

export const SKILL_ICON: Record<SkillId, Icon> = {
  salvaging: Icon.Hammer,
  mining: Icon.Mountain,
  foraging: Icon.Leaf,
  cooking: Icon.MugSteam,
  engineering: Icon.Gear,
  combat: Icon.Shield,
  hydroponics: Icon.Raindrop,
  xenochemistry: Icon.Pill,
};

export type Place = "base" | "equipment" | "trade" | "bounties" | "shop" | "inventory" | "stats";

/** The screens besides the skills, as they are listed on the main menu. */
export const PLACES: { id: Place; title: string; icon: Icon; blurb: string }[] = [
  { id: "base", title: "Base", icon: Icon.House, blurb: "Build and upgrade your camp." },
  {
    id: "equipment",
    title: "Equipment",
    icon: Icon.Shield,
    blurb: "Choose what you wear and wield.",
  },
  { id: "trade", title: "Trade", icon: Icon.Coins, blurb: "Buy and sell with the Sorenians." },
  {
    id: "bounties",
    title: "Bounties",
    icon: Icon.Flag,
    blurb: "Take hunting contracts for Marks.",
  },
  { id: "shop", title: "Bounty Shop", icon: Icon.Cart, blurb: "Spend your Marks on rare gear." },
  {
    id: "inventory",
    title: "Inventory",
    icon: Icon.Box,
    blurb: "Eat, wear, drink and sell what you carry.",
  },
  { id: "stats", title: "Stats", icon: Icon.BarChart, blurb: "Lifetime numbers." },
];
