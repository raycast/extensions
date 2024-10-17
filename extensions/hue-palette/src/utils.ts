import fetch from "node-fetch";

export async function getHue() {
  const response = await fetch(
    "https://raw.githubusercontent.com/ridemountainpig/hue/refs/heads/main/public/hue.json",
  );
  const data = await response.json();
  return data;
}

export async function generateHue(colorOne: string, colorTwo: string) {
  const response = await fetch(
    `https://www.hue-palette.com/api/hue-generator?hueColor=${colorOne}-${colorTwo}`,
  );
  const data = await response.json();
  return data;
}

export function generateColorImageUrl(color: string) {
  return `https://singlecolorimage.com/get/${color}/400x400`;
}

export function generateRandomHexColor(): string {
  const hexChars = "0123456789ABCDEF";
  let color = "#";

  for (let i = 0; i < 6; i++) {
    color += hexChars[Math.floor(Math.random() * 16)];
  }

  return color;
}
