import { Renderer } from "../../types/renderer";

export const imageRenderer: Renderer = function imageRenderer(request) {
  return `![${request.url}](${request.url})`;
};
