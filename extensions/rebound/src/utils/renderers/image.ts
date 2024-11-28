import { Renderer } from "../../types/renderer";

export const imageRenderer: Renderer = function imageRenderer(rebound) {
  return `![${rebound.url}](${rebound.url})`;
};
