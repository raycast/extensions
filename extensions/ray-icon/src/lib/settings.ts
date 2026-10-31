// Mirrors SettingsType and the presets from ray.so/icon (raycast/ray-so app/(navigation)/icon).

export type FillType = "Linear" | "Radial" | "Solid";

export type IconSettings = {
  icon?: string;
  customSvg?: string;
  fileName: string;
  backgroundFillType: FillType;
  backgroundStartColor: string;
  backgroundEndColor: string;
  backgroundAngle: number;
  backgroundPosition: string;
  backgroundSpread: number;
  backgroundRadius: number;
  backgroundStrokeSize: number;
  backgroundStrokeColor: string;
  backgroundStrokeOpacity: number;
  backgroundRadialGlare: boolean;
  backgroundNoiseTexture: boolean;
  backgroundNoiseTextureOpacity: number;
  iconColor: string;
  iconSize: number;
  iconOffsetX: number;
  iconOffsetY: number;
  selectedPresetIndex: number | null;
};

export type Preset = Pick<
  IconSettings,
  "backgroundFillType" | "backgroundStartColor" | "backgroundEndColor" | "iconColor"
> &
  Partial<Pick<IconSettings, "backgroundAngle" | "backgroundPosition">>;

export const PRESETS: Preset[] = [
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#8E2DE2",
    backgroundEndColor: "#4A00E0",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#99F2C8",
    backgroundEndColor: "#1F4037",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#F953C6",
    backgroundEndColor: "#B91D73",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#91EAE4",
    backgroundEndColor: "#7F7FD5",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#F5AF19",
    backgroundEndColor: "#F12711",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#EAAFC8",
    backgroundEndColor: "#EC2F4B",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#FF7DB4",
    backgroundEndColor: "#654EA3",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#00B4DB",
    backgroundEndColor: "#003357",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#A8C0FF",
    backgroundEndColor: "#3F2B96",
    backgroundAngle: 90,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#DD1818",
    backgroundEndColor: "#380202",
    backgroundAngle: 135,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#DECBA4",
    backgroundEndColor: "#3E5151",
    backgroundAngle: 45,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#FC466B",
    backgroundEndColor: "#3F5EFB",
    backgroundAngle: 180,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#CCCFE2",
    backgroundEndColor: "#25242B",
    backgroundAngle: 180,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#68AEFF",
    backgroundEndColor: "#003EB7",
    backgroundAngle: 180,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#C9D6FF",
    backgroundEndColor: "#596AA1",
    backgroundAngle: 180,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Linear",
    backgroundStartColor: "#5C5C5C",
    backgroundEndColor: "#0F1015",
    backgroundAngle: 180,
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#695BF8",
    backgroundEndColor: "#131308",
    backgroundPosition: "50%,0%",
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#4d4d4d",
    backgroundEndColor: "#000000",
    backgroundPosition: "50%,0%",
    iconColor: "#e6e6e6",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#f5af19",
    backgroundEndColor: "#f12711",
    backgroundPosition: "50%,50%",
    iconColor: "#FFFFFF",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#1D6E47",
    backgroundEndColor: "#041B11",
    backgroundPosition: "50%,0%",
    iconColor: "#DCEEDE",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#ffffff",
    backgroundEndColor: "#666666",
    backgroundPosition: "50%,100%",
    iconColor: "#232323",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#d9f1f8",
    backgroundEndColor: "#002069",
    backgroundPosition: "50%,100%",
    iconColor: "#e3efff",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#f95356",
    backgroundEndColor: "#7e0000",
    backgroundPosition: "50%,50%",
    iconColor: "#ffd5d5",
  },
  {
    backgroundFillType: "Radial",
    backgroundStartColor: "#ffbb00",
    backgroundEndColor: "#ffe74b",
    backgroundPosition: "50%,0%",
    iconColor: "#2a1a00",
  },
];

export const DEFAULT_SETTINGS: IconSettings = {
  fileName: "extension_icon",
  icon: "rocket",
  backgroundRadius: 128,
  backgroundStrokeSize: 0,
  backgroundStrokeColor: "#FFFFFF",
  backgroundRadialGlare: false,
  backgroundNoiseTexture: false,
  backgroundNoiseTextureOpacity: 25,
  backgroundStrokeOpacity: 100,
  backgroundPosition: "50%,0%",
  backgroundSpread: 100,
  backgroundAngle: 0,
  iconSize: 352,
  iconOffsetX: 0,
  iconOffsetY: 0,
  customSvg: undefined,
  ...PRESETS[0],
  selectedPresetIndex: 0,
};

export function applyPreset(settings: IconSettings, index: number): IconSettings {
  const preset = PRESETS[index];
  if (!preset) return settings;
  return {
    ...settings,
    backgroundAngle: 0,
    backgroundPosition: "50%,0%",
    ...preset,
    selectedPresetIndex: index,
  };
}

export function describePreset(preset: Preset): string {
  const shape =
    preset.backgroundFillType === "Radial"
      ? `radial from ${preset.backgroundPosition}`
      : `linear ${preset.backgroundAngle ?? 0}°`;
  return `${preset.backgroundStartColor} → ${preset.backgroundEndColor}, ${shape}`;
}

/** Link that opens the same settings in ray.so/icon (custom SVGs can't travel in the URL). */
export function raySoUrl(settings: IconSettings): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(settings)) {
    if (key === "customSvg") continue;
    params.set(key, String(value));
  }
  return `https://ray.so/icon?${params.toString()}`;
}
