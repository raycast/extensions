import { Color, Icon, Image } from "@raycast/api";
import { FocusMode } from "./focus";

// Closest Raycast icon for the SF Symbol each Focus mode uses, keyed by the symbol's first word.
const ICONS: Record<string, Icon> = {
  moon: Icon.Moon,
  bed: Icon.MoonDown,
  zzz: Icon.MoonDown,
  person: Icon.Person,
  building: Icon.Building,
  briefcase: Icon.Building,
  car: Icon.Car,
  bicycle: Icon.Bike,
  airplane: Icon.Airplane,
  tram: Icon.Train,
  bus: Icon.Train,
  figure: Icon.Heartbeat,
  dumbbell: Icon.Weights,
  gamecontroller: Icon.GameController,
  book: Icon.Book,
  books: Icon.Book,
  graduationcap: Icon.Book,
  brain: Icon.Leaf,
  leaf: Icon.Leaf,
  tree: Icon.Tree,
  music: Icon.Music,
  headphones: Icon.Headphones,
  paintbrush: Icon.Brush,
  paintpalette: Icon.Brush,
  pencil: Icon.Pencil,
  house: Icon.House,
  cup: Icon.Mug,
  mug: Icon.Mug,
  laptopcomputer: Icon.Monitor,
  desktopcomputer: Icon.Monitor,
  display: Icon.Monitor,
  keyboard: Icon.Keyboard,
  terminal: Icon.Terminal,
  hammer: Icon.Hammer,
  wrench: Icon.Hammer,
  camera: Icon.Camera,
  film: Icon.Video,
  tv: Icon.Video,
  heart: Icon.Heart,
  sparkles: Icon.Stars,
  star: Icon.Star,
  sun: Icon.Sun,
  gift: Icon.Gift,
  globe: Icon.Globe,
  phone: Icon.Phone,
  cart: Icon.Cart,
  bag: Icon.Cart,
  pills: Icon.Pill,
  stethoscope: Icon.Pill,
  trophy: Icon.Trophy,
  flag: Icon.Flag,
  bolt: Icon.Bolt,
  calendar: Icon.Calendar,
  clock: Icon.Clock,
  hourglass: Icon.Clock,
};

// macOS system colors (light and dark variants) that Focus modes are tinted with.
const COLORS: Record<string, Color.ColorLike> = {
  systemIndigoColor: { light: "#5856D6", dark: "#5E5CE6" },
  systemPurpleColor: { light: "#AF52DE", dark: "#BF5AF2" },
  systemTealColor: { light: "#30B0C7", dark: "#40C8E0" },
  systemBlueColor: { light: "#007AFF", dark: "#0A84FF" },
  systemCyanColor: { light: "#32ADE6", dark: "#64D2FF" },
  systemMintColor: { light: "#00C7BE", dark: "#63E6E2" },
  systemGreenColor: { light: "#34C759", dark: "#30D158" },
  systemYellowColor: { light: "#FFCC00", dark: "#FFD60A" },
  systemOrangeColor: { light: "#FF9500", dark: "#FF9F0A" },
  systemRedColor: { light: "#FF3B30", dark: "#FF453A" },
  systemPinkColor: { light: "#FF2D55", dark: "#FF375F" },
  systemBrownColor: { light: "#A2845E", dark: "#AC8E68" },
  systemGrayColor: { light: "#8E8E93", dark: "#98989D" },
};

export function focusColor(mode: FocusMode): Color.ColorLike {
  return COLORS[mode.tint ?? ""] ?? COLORS.systemIndigoColor;
}

export function focusIcon(mode: FocusMode): Image.ImageLike {
  const symbol = mode.symbol ?? "";
  // "person.lanyardcard" is the Work Focus badge, not a person.
  const source = symbol.includes("lanyardcard") ? Icon.Building : (ICONS[symbol.split(".")[0]] ?? Icon.CircleFilled);
  return { source, tintColor: focusColor(mode) };
}
