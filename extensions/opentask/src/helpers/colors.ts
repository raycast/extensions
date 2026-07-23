// OpenTask's 20-color palette (light display values from the web app's tokens).
const PALETTE: Record<string, string> = {
  berry_red: "#b8255f",
  red: "#cf473a",
  orange: "#c77100",
  yellow: "#b29104",
  olive_green: "#949c31",
  lime_green: "#65a33a",
  green: "#369307",
  mint_green: "#42a393",
  teal: "#148fad",
  sky_blue: "#319dc0",
  light_blue: "#6988a4",
  blue: "#2a67e2",
  grape: "#692ec2",
  violet: "#ac30cc",
  lavender: "#a4698c",
  magenta: "#e05095",
  salmon: "#b2635c",
  charcoal: "#808080",
  grey: "#999999",
  taupe: "#8f7a69",
};

export function colorHex(name: string): string {
  return PALETTE[name] ?? PALETTE.charcoal;
}
