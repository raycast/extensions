import { environment } from "@raycast/api";
import { rm } from "node:fs/promises";
import path from "node:path";
import { renderDiagram } from "../lib/render";
import { saveDiagram, writeDiagram } from "../lib/files";
import { getSettings } from "../settings";
import { createDiagramResponse } from "../lib/ai-response";

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

/** Render and save a diagram locally. Return the result's markdown verbatim to link to the actual Pele image. */
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
  try {
    const format = input.format ?? "png";
    const filePath = await saveDiagram(format === "svg" ? files.svgPath : files.pngPath, settings.saveFolder);
    return createDiagramResponse(diagram, filePath, format);
  } finally {
    await rm(path.dirname(files.pngPath), { recursive: true, force: true });
  }
}
