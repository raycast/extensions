import type { CatppuccinFlavor, FlavorName } from "@catppuccin/palette";
import { flavors } from "@catppuccin/palette";

export const getAllFlavors = (): FlavorName[] => Object.keys(flavors) as FlavorName[];

export const getFlavorColors = (flavorName: FlavorName): CatppuccinFlavor => {
  return flavors[flavorName];
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
