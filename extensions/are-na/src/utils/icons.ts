import { Image } from "@raycast/api";
import type { Block } from "../api/types";

export const textIcon = (text: string): Image.ImageLike => {
  const textLimit = 20;
  const truncatedText = text.length > textLimit ? text.slice(0, textLimit) + "..." : text;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect x="0" y="0" width="200" height="200" fill="#b3b3b3" rx="10"></rect>
      <text x="100"
            y="100"
            text-anchor="middle"
            alignment-baseline="middle"
            lengthAdjust="spacingAndGlyphs"
            font-size="16" 
            fill="#000">
        ${truncatedText}
      </text>
    </svg>
  `.replaceAll("\n", "");

  // Return the image using a properly encoded data URL
  return {
    source: `data:image/svg+xml,${svg}`,
  };
};

export const getIconSource = (block: Block): Image.ImageLike => {
  if (block.image?.thumb?.url) {
    return { source: block.image.thumb.url };
  }
  if (block.class === "Text") {
    return textIcon(block.content || block.title || "Text");
  }
  return { source: "extension-icon.png" };
};
