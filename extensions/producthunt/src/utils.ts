import { Image } from "@raycast/api";

export function getIcon(index: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#FF6154" rx="10"></rect>
  <text
  font-size="22"
  fill="#FFF"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${index}</text>
</svg>
  `.replace(/\n/g, "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}
