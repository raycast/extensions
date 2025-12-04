import DropdownType from "../models/DropdownType";

export const MODRINTH_BASE_URL = "https://modrinth.com/" as const;
export const MODRINTH_API_URL = "https://api.modrinth.com/v2/" as const;

export const modrinthColors: Map<string, string> = new Map([
  ["fabric", "#DBB69C"],
  ["quilt", "#C696F9"],
  ["forge", "#959EEF"],
  ["neoforge", "#F99E6B"],
  ["bukkit", "#F6AF7B"],
  ["bungeecord", "#D2C080"],
  ["folia", "#A5E388"],
  ["paper", "#EEAAA9"],
  ["purpur", "#C3ABF7"],
  ["spigot", "#F1CC85"],
  ["velocity", "#83D5EF"],
  ["waterfall", "#78A4FB"],
  ["sponge", "#F9E580"],
  ["minecraft", "#66BB6A"],
  ["default", "#96A2B0"],
]);

export const modloaderDropdown: DropdownType[] = [
  { name: "Fabric", id: "fabric" },
  { name: "Forge", id: "forge" },
  { name: "Neoforge", id: "neoforge" },
  { name: "Quilt", id: "quilt" },
];

export const vanillaDropdown: DropdownType[] = [
  { name: "Bukkit", id: "bukkit" },
  { name: "BungeeCord", id: "bungeecord" },
  { name: "Datapacks", id: "datapack" },
  { name: "Folia", id: "folia" },
  { name: "Paper", id: "paper" },
  { name: "Purpur", id: "purpur" },
  { name: "Spigot", id: "spigot" },
  { name: "Velocity", id: "velocity" },
  { name: "Waterfall", id: "waterfall" },
  { name: "Sponge", id: "sponge" },
];

export const projectDropdown: DropdownType[] = [
  { name: "Data Packs", id: "datapack" },
  { name: "Mods", id: "mod" },
  { name: "Modpacks", id: "modpack" },
  { name: "Plugins", id: "plugin" },
  { name: "Resource Packs", id: "resourcepack" },
  { name: "Shaders", id: "shader" },
];

export const newlinePlaceholder = "!NEWLINEPLACEHOLDER!";

export const SortingTypes = {
  relevance: { value: "relevance", label: "Best Matches" },
  downloads: { value: "downloads", label: "Most Downloaded" },
  follows: { value: "follows", label: "Most Popular" },
  newest: { value: "newest", label: "Recently Added" },
  updated: { value: "updated", label: "Recently Updated" },
} as const;

export type SortingType = keyof typeof SortingTypes;
