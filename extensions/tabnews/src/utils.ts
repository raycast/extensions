import { Image } from "@raycast/api";

export function getIcon(index: number): Image.ImageLike {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
        <rect x="0" y="0" width="40" height="40" fill="#0d1117" rx="10" />
        <text
        font-size="22"
        fill="#e6edf3"
        font-family="Verdana"
        text-anchor="middle"
        alignment-baseline="baseline"
        x="20.5"
        y="32.5">${index}</text>
    </svg>
      `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}
