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
  fabrication: Icon.WrenchScrewdriver,
  combat: Icon.Shield,
  hydroponics: Icon.Raindrop,
  xenochemistry: Icon.Pill,
  xenofishing: Icon.Waveform,
  smelting: Icon.Bolt,
  hacking: Icon.Terminal,
  exploration: Icon.Map,
  companions: Icon.Heart,
  stargazing: Icon.Stars,
};

export type Place =
  "base" | "equipment" | "trade" | "bounties" | "shop" | "inventory" | "voyage" | "stats" | "collection" | "settings";

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
  {
    id: "voyage",
    title: "Voyage",
    icon: Icon.Rocket,
    blurb: "Launch the Rescue Ship and spend Starlight on perks.",
  },
  { id: "stats", title: "Stats", icon: Icon.BarChart, blurb: "Lifetime numbers." },
  {
    id: "collection",
    title: "Collection Log",
    icon: Icon.Trophy,
    blurb: "Achievements, pets, and everything you have found.",
  },
  {
    id: "settings",
    title: "Settings",
    icon: Icon.Gear,
    blurb: "Number format, notifications and save backup.",
  },
];
