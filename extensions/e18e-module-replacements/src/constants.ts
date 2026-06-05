import { Color } from "@raycast/api";
import { all, ModuleReplacement } from "module-replacements";

export const TYPE_LABEL: Record<ModuleReplacement["type"], string> = {
  native: "Available natively",
  simple: "Simple or drop-in replacement",
  documented: "Community choice",
  removal: "Can be removed",
};

export const TYPE_COLOR: Record<ModuleReplacement["type"], Color> = {
  native: Color.Green,
  simple: Color.Blue,
  documented: Color.Yellow,
  removal: Color.Red,
};

export const ALL_MODULES = Object.values(all.mappings).map((value) => ({
  ...value,
  replacements: value.replacements.map((key) => all.replacements[key]),
}));

export type ModuleReplacementResolved = (typeof ALL_MODULES)[number];

export const Mappings = new Map(ALL_MODULES.map((mapping) => [mapping.moduleName, mapping]));
