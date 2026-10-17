import { environment } from "@raycast/api";
import { renderDiagram } from "../lib/render";
import { saveDiagram, writeDiagram } from "../lib/files";
import { getSettings } from "../settings";

type Input = {
  /** Complete Mermaid syntax, including any YAML frontmatter config. Preserve supplied config or generate valid Mermaid code from the user's description. */
  mermaid: string;
  /** Color theme. If omitted, use the user's preferred theme. */
  theme?: "light" | "dark" | "flexoki-light" | "flexoki-dark";
  /** Export format. Defaults to PNG. */
  format?: "png" | "svg";
  /** Remove the canvas background. Nodes keep their theme colors. */
  transparent?: boolean;
};

/** Render a Mermaid diagram locally and save the image to the user's Save Folder (Downloads/Pele by default). */
export default async function generateDiagram(input: Input) {
  const settings = getSettings();
  const diagram = await renderDiagram(
    input.mermaid,
    {
      ...settings.options,
      theme: input.theme ?? settings.options.theme,
      transparent: input.transparent ?? settings.options.transparent,
    },
    environment.assetsPath,
  );
  const files = await writeDiagram(diagram, settings.cachePath);
  const format = input.format ?? "png";
  const filePath = await saveDiagram(format === "svg" ? files.svgPath : files.pngPath, settings.saveFolder);
  return {
    filePath,
    format,
    diagramType: diagram.type,
    theme: diagram.theme,
    width: format === "png" ? diagram.pngWidth : diagram.width,
    height: format === "png" ? diagram.pngHeight : diagram.height,
  };
}
