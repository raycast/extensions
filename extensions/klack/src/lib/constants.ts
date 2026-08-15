export const KLACK_BUNDLE_ID = "com.henrikruscon.Klack";

export const NONE_SWITCH = "None" as const;

export const BRANDS = [
  { name: "Keychron", switches: [{ name: "Super Red", tint: "#ef4444", icon: "switches/SuperRed.png" }] },
  { name: "CherryMX", switches: [{ name: "Japanese Black", tint: "#57534e", icon: "switches/JapaneseBlack.png" }] },
  {
    name: "Everglide",
    switches: [
      { name: "Crystal Purple", tint: "#f0abfc", icon: "switches/CrystalPurple.png" },
      { name: "Oreo", tint: "#9e9894", icon: "switches/Oreo.png" },
    ],
  },
  { name: "Flurples", switches: [{ name: "Cardboard", tint: "#f6ac8a", icon: "switches/Cardboard.png" }] },
  { name: "Gateron", switches: [{ name: "Milky Yellow", tint: "#feedac", icon: "switches/MilkyYellow.png" }] },
  { name: "NovelKeys", switches: [{ name: "Cream", tint: "#ffedd5", icon: "switches/Cream.png" }] },
] as const;

export const NONE_BRAND = {
  name: "Off",
  switches: [{ name: NONE_SWITCH, tint: "#737373", icon: undefined }],
} as const;

type SwitchEntry = { name: string; tint: string; icon?: string };
export const SWITCHES_BY_NAME: Record<string, SwitchEntry> = Object.fromEntries(
  [...BRANDS, NONE_BRAND].flatMap((b) => (b.switches as readonly SwitchEntry[]).map((s) => [s.name, s])),
);

export const ALL_SWITCH_NAMES = [NONE_SWITCH, ...BRANDS.flatMap((b) => b.switches.map((s) => s.name))] as const;

export const VOLUME_PRESETS = {
  Soft: { label: "Soft", value: 30 },
  Balanced: { label: "Balanced", value: 60 },
  Loud: { label: "Loud", value: 90 },
} as const;
