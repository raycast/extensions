import { Renderer } from "../../types/renderer";

export const jsonRenderer: Renderer = function jsonRenderer(_, response) {
  return `\`\`\`json\n${JSON.stringify(JSON.parse(response.body), null, 2)}\n\`\`\``;
};
