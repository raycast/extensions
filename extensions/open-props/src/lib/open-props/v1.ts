import { VersionConfig } from "./types";

export const config: VersionConfig = {
  version: "1",
  sections: [
    { name: "Animations", file: "animations.min.css" },
    { name: "Aspects", file: "aspects.min.css" },
    { name: "Borders", file: "borders.min.css" },
    { name: "Colors", file: "colors.min.css", type: "color" },
    { name: "Durations", file: "durations.min.css" },
    { name: "Easings", file: "easings.min.css" },
    { name: "Gradients", file: "gradients.min.css" },
    { name: "Masks (Edges)", file: "masks.edges.min.css" },
    { name: "Masks (Corner Cuts)", file: "masks.corner-cuts.min.css" },
    { name: "Media", file: "media.min.css" },
    { name: "Shadows", file: "shadows.min.css" },
    { name: "Sizes", file: "sizes.min.css" },
    { name: "Typography", file: "fonts.min.css" },
    { name: "Z-Index", file: "zindex.min.css" },
    { name: "Brand Colors", file: "brand-colors.min.css", type: "color" },
    { name: "Palette Colors", file: "palette.min.css" },
  ],
};

export const colorConfig: VersionConfig = {
  version: "1",
  sections: [
    { name: "Gray", file: "gray.min.css", type: "color" },
    { name: "Stone", file: "stone.min.css", type: "color" },
    { name: "Red", file: "red.min.css", type: "color" },
    { name: "Pink", file: "pink.min.css", type: "color" },
    { name: "Purple", file: "purple.min.css", type: "color" },
    { name: "Violet", file: "violet.min.css", type: "color" },
    { name: "Indigo", file: "indigo.min.css", type: "color" },
    { name: "Blue", file: "blue.min.css", type: "color" },
    { name: "Cyan", file: "cyan.min.css", type: "color" },
    { name: "Teal", file: "teal.min.css", type: "color" },
    { name: "Green", file: "green.min.css", type: "color" },
    { name: "Lime", file: "lime.min.css", type: "color" },
    { name: "Yellow", file: "yellow.min.css", type: "color" },
    { name: "Orange", file: "orange.min.css", type: "color" },
    { name: "Choco", file: "choco.min.css", type: "color" },
    { name: "Brown", file: "brown.min.css", type: "color" },
    { name: "Sand", file: "sand.min.css", type: "color" },
    { name: "Camo", file: "camo.min.css", type: "color" },
    { name: "Jungle", file: "jungle.min.css", type: "color" },
  ],
};
