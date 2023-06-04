export type Color = {
  key: string;
  name: string;
  value: string;
};

export const berryRed: Color = {
  key: "berry_red",
  name: "Berry Red",
  value: "#b8255f",
} as const;
export const red: Color = {
  key: "red",
  name: "Red",
  value: "#db4035",
} as const;
export const orange: Color = {
  key: "orange",
  name: "Orange",
  value: "#ff9933",
} as const;
export const yellow: Color = {
  key: "yellow",
  name: "Yellow",
  value: "#fad000",
} as const;
export const oliveGreen: Color = {
  key: "olive_green",
  name: "Olive Green",
  value: "#afb83b",
} as const;
export const limeGreen: Color = {
  key: "lime_green",
  name: "Lime Green",
  value: "#7ecc49",
} as const;
export const green: Color = {
  key: "green",
  name: "Green",
  value: "#299438",
} as const;
export const mintGreen: Color = {
  key: "mint_green",
  name: "Mint Green",
  value: "#6accbc",
} as const;
export const turquoise: Color = {
  key: "turquoise",
  name: "Turquoise",
  value: "#158fad",
} as const;
export const skyBlue: Color = {
  key: "sky_blue",
  name: "Sky Blue",
  value: "#14aaf5",
} as const;
export const lightBlue: Color = {
  key: "light_blue",
  name: "Light Blue",
  value: "#96c3eb",
} as const;
export const blue: Color = {
  key: "blue",
  name: "Blue",
  value: "#4073ff",
} as const;
export const grape: Color = {
  key: "grape",
  name: "Grape",
  value: "#884dff",
} as const;
export const violet: Color = {
  key: "violet",
  name: "Violet",
  value: "#af38eb",
} as const;
export const lavender: Color = {
  key: "lavender",
  name: "Lavender",
  value: "#eb96eb",
} as const;
export const magenta: Color = {
  key: "magenta",
  name: "Magenta",
  value: "#e05194",
} as const;
export const salmon: Color = {
  key: "salmon",
  name: "Salmon",
  value: "#ff8d85",
} as const;
export const charcoal: Color = {
  key: "charcoal",
  name: "Charcoal",
  value: "#808080",
} as const;
export const gray: Color = {
  key: "gray",
  name: "Gray",
  value: "#b8b8b8",
} as const;
export const taupe: Color = {
  key: "taupe",
  name: "Taupe",
  value: "#ccac93",
} as const;

export const colors = [
  berryRed,
  red,
  orange,
  yellow,
  oliveGreen,
  limeGreen,
  green,
  mintGreen,
  turquoise,
  skyBlue,
  lightBlue,
  blue,
  grape,
  violet,
  lavender,
  magenta,
  salmon,
  charcoal,
  gray,
  taupe,
] as const;

export function getColorByKey(colorKey: string): Color {
  const color = colors.find((color) => color.key === colorKey);
  return color ?? charcoal;
}
