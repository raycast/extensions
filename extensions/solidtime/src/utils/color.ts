import { Image } from "@raycast/api";

export function createColorIcon(color: string): Image.ImageLike {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${color}"/></svg>`;
  return {
    source: `data:image/svg+xml;base64,${btoa(svg)}`,
    mask: Image.Mask.Circle,
  };
}
