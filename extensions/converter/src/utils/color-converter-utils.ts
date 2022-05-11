export const opacityToHex = (opacity: number) => {
  const num = Math.round(255 * opacity);
  const hex = num.toString(16);
  return hex.length < 2 ? "0" + hex : hex;
};

export const colorTags = [
  { title: "Color", value: "Color" },
  { title: "Opacity", value: "Opacity" },
];
