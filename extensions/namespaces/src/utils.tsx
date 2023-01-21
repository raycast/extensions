import { spawn } from "child_process";

import { Icon, LocalStorage } from "@raycast/api";

import { runAppleScript } from "run-applescript";
import { v4 as uuid } from "uuid";

import { Preferences, Color, ModifierMap, IconMap, Space } from "./types";

// start with 140 cross-browser-friendly named colors
const colors: Color = {
  maroon: "#800000",
  darkred: "#8B0000",
  brown: "#A52A2A",
  firebrick: "#B22222",
  crimson: "#DC143C",
  red: "#FF0000",
  tomato: "#FF6347",
  coral: "#FF7F50",
  indianred: "#CD5C5C",
  lightcoral: "#F08080",
  darksalmon: "#E9967A",
  salmon: "#FA8072",
  lightsalmon: "#FFA07A",
  orangered: "#FF4500",
  darkorange: "#FF8C00",
  orange: "#FFA500",
  gold: "#FFD700",
  darkgoldenrod: "#B8860B",
  goldenrod: "#DAA520",
  palegoldenrod: "#EEE8AA",
  darkkhaki: "#BDB76B",
  khaki: "#F0E68C",
  olive: "#808000",
  yellow: "#FFFF00",
  yellowgreen: "#9ACD32",
  darkolivegreen: "#556B2F",
  olivedrab: "#6B8E23",
  lawngreen: "#7CFC00",
  chartreuse: "#7FFF00",
  greenyellow: "#ADFF2F",
  darkgreen: "#006400",
  green: "#008000",
  forestgreen: "#228B22",
  lime: "#00FF00",
  limegreen: "#32CD32",
  lightgreen: "#90EE90",
  palegreen: "#98FB98",
  darkseagreen: "#8FBC8F",
  mediumspringgreen: "#00FA9A",
  springgreen: "#00FF7F",
  seagreen: "#2E8B57",
  mediumaquamarine: "#66CDAA",
  mediumseagreen: "#3CB371",
  lightseagreen: "#20B2AA",
  darkslategray: "#2F4F4F",
  teal: "#008080",
  darkcyan: "#008B8B",
  aqua: "#00FFFF",
  cyan: "#00FFFF",
  lightcyan: "#E0FFFF",
  darkturquoise: "#00CED1",
  turquoise: "#40E0D0",
  mediumturquoise: "#48D1CC",
  paleturquoise: "#AFEEEE",
  aquamarine: "#7FFFD4",
  powderblue: "#B0E0E6",
  cadetblue: "#5F9EA0",
  steelblue: "#4682B4",
  cornflowerblue: "#6495ED",
  deepskyblue: "#00BFFF",
  dodgerblue: "#1E90FF",
  lightblue: "#ADD8E6",
  skyblue: "#87CEEB",
  lightskyblue: "#87CEFA",
  midnightblue: "#191970",
  navy: "#000080",
  darkblue: "#00008B",
  mediumblue: "#0000CD",
  blue: "#0000FF",
  royalblue: "#4169E1",
  blueviolet: "#8A2BE2",
  indigo: "#4B0082",
  darkslateblue: "#483D8B",
  slateblue: "#6A5ACD",
  mediumslateblue: "#7B68EE",
  mediumpurple: "#9370DB",
  darkmagenta: "#8B008B",
  darkviolet: "#9400D3",
  darkorchid: "#9932CC",
  mediumorchid: "#BA55D3",
  purple: "#800080",
  thistle: "#D8BFD8",
  plum: "#DDA0DD",
  violet: "#EE82EE",
  fuchsia: "#FF00FF",
  orchid: "#DA70D6",
  mediumvioletred: "#C71585",
  palevioletred: "#DB7093",
  deeppink: "#FF1493",
  hotpink: "#FF69B4",
  lightpink: "#FFB6C1",
  pink: "#FFC0CB",
  antiquewhite: "#FAEBD7",
  beige: "#F5F5DC",
  bisque: "#FFE4C4",
  blanchedalmond: "#FFEBCD",
  wheat: "#F5DEB3",
  cornsilk: "#FFF8DC",
  lemonchiffon: "#FFFACD",
  lightgoldenrodyellow: "#FAFAD2",
  lightyellow: "#FFFFE0",
  saddlebrown: "#8B4513",
  sienna: "#A0522D",
  chocolate: "#D2691E",
  peru: "#CD853F",
  sandybrown: "#F4A460",
  burlywood: "#DEB887",
  tan: "#D2B48C",
  rosybrown: "#BC8F8F",
  moccasin: "#FFE4B5",
  navajowhite: "#FFDEAD",
  peachpuff: "#FFDAB9",
  mistyrose: "#FFE4E1",
  lavenderblush: "#FFF0F5",
  linen: "#FAF0E6",
  oldlace: "#FDF5E6",
  papayawhip: "#FFEFD5",
  seashell: "#FFF5EE",
  mintcream: "#F5FFFA",
  slategray: "#708090",
  lightslategray: "#778899",
  lightsteelblue: "#B0C4DE",
  lavender: "#E6E6FA",
  floralwhite: "#FFFAF0",
  aliceblue: "#F0F8FF",
  ghostwhite: "#F8F8FF",
  honeydew: "#F0FFF0",
  ivory: "#FFFFF0",
  azure: "#F0FFFF",
  snow: "#FFFAFA",
  black: "#000000",
  dimgray: "#696969",
  gray: "#808080",
  darkgray: "#A9A9A9",
  silver: "#C0C0C0",
  lightgray: "#D3D3D3",
  gainsboro: "#DCDCDC",
  whitesmoke: "#F5F5F5",
  white: "#FFFFFF",
};

const modifierMap: ModifierMap = {
  "shift down": "⇧",
  "control down": "⌃",
  "option down": "⌥",
  "command down": "⌘",
};

const iconMap: IconMap = Icon;

const namespacesPreferences = {
  load: async (): Promise<Preferences> => {
    let preferences = { spaces: undefined };

    try {
      const maybePreferences: string | undefined = await LocalStorage.getItem("namespaces");

      if (maybePreferences) {
        preferences = JSON.parse(maybePreferences);
      }
    } catch (_) {
      // noop
    }

    return preferences;
  },
  save: async (preferences: Preferences) => {
    await LocalStorage.setItem("namespaces", JSON.stringify(preferences));
  },
};

const generateConfigurableSpace = () => {
  return {
    id: uuid(),
    name: `My New Space`,
    keyCode: undefined,
    modifiers: [],
    color: colors.white,
    icon: "AppWindow",
    confetti: false,
    configured: false,
  };
};

const switchToSpace = async (space: Space) => {
  return runAppleScript(`
tell application "System Events"
    tell application "System Events" to key code ${space.keyCode} using {${space.modifiers.join(",")}}
end tell
    `);
};

const confetti = async () => {
  return spawn(`open raycast://confetti`, { shell: true });
};

export { colors, modifierMap, iconMap, namespacesPreferences, generateConfigurableSpace, switchToSpace, confetti };
