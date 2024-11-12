import type { CatppuccinFlavor } from "@catppuccin/palette";
import { flavors } from "@catppuccin/palette";

export type CatppuccinFlavors = typeof flavors;
export type FlavorName = keyof CatppuccinFlavors;

export const getAllFlavors = (): FlavorName[] => Object.keys(flavors) as FlavorName[];

export const getFlavorColors = (flavorName: FlavorName): CatppuccinFlavor => {
  return flavors[flavorName];
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
