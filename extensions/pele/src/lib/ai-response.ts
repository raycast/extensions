import { pathToFileURL } from "node:url";
import type { Diagram } from "./render";

export function createDiagramResponse(diagram: Diagram, filePath: string, format: "png" | "svg") {
  const fileUrl = pathToFileURL(filePath).href;
  return {
    filePath,
    fileUrl,
    format,
    diagramType: diagram.type,
    theme: diagram.theme,
    width: format === "png" ? diagram.pngWidth : diagram.width,
    height: format === "png" ? diagram.pngHeight : diagram.height,
    // A Mermaid fence would redraw the source with Raycast's different renderer.
    // Local image embeds are unsupported; link to the actual Pele export instead.
    markdown: `[Open Pele ${format.toUpperCase()}](<${fileUrl}>)\n\nRaycast AI Chat cannot display the local image inline. Open the file to see the rendered diagram.`,
  };
}
