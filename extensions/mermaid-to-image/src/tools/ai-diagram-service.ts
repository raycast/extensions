import { pathToFileURL } from "url";
import { supportsBeautifulMermaidSyntax } from "../renderers/select-renderer";
import { DiagramOptions } from "../utils/diagram";
import { BrowserBootstrapRequiredError } from "../utils/browser-errors";
import { cleanMermaidCode } from "../utils/mermaid-code";
import { DiagramResult, SvgRasterStrategy } from "../renderers/types";

export interface AiDiagramGenerationOptions {
  mermaidSyntax: string;
  tempFileRef: { current: string | null };
  scale?: number;
  width?: number;
}

export interface AiDiagramGenerationDependencies {
  generateDiagram: (
    mermaidCode: string,
    tempFileRef: { current: string | null },
    options: DiagramOptions,
  ) => Promise<DiagramResult>;
  copyGeneratedImage: (options: {
    format: string;
    imagePath: string;
    svgRasterStrategy?: SvgRasterStrategy;
  }) => Promise<void>;
  openInPreview: (imagePath: string) => Promise<void>;
}

export interface AiDiagramGenerationResult {
  outputPath: string;
  format: "svg" | "png";
  engine: "beautiful" | "mmdc";
  message: string;
}

export function resolveAiDiagramOptions(mermaidSyntax: string): Pick<DiagramOptions, "outputFormat" | "renderEngine"> {
  const cleanedCode = cleanMermaidCode(mermaidSyntax);
  if (supportsBeautifulMermaidSyntax(cleanedCode)) {
    return {
      outputFormat: "svg",
      renderEngine: "auto",
    };
  }

  return {
    outputFormat: "png",
    renderEngine: "compatible",
  };
}

export async function generateAiDiagramArtifact(
  options: AiDiagramGenerationOptions,
  dependencies: AiDiagramGenerationDependencies,
): Promise<AiDiagramGenerationResult> {
  const cleanedCode = cleanMermaidCode(options.mermaidSyntax);
  const renderOptions = resolveAiDiagramOptions(cleanedCode);
  let result: DiagramResult;

  try {
    result = await dependencies.generateDiagram(cleanedCode, options.tempFileRef, {
      ...renderOptions,
      usePersistentOutputDir: true,
      scale: options.scale,
      width: options.width,
    });
  } catch (error) {
    if (error instanceof BrowserBootstrapRequiredError) {
      throw new Error(
        "Compatible rendering needs a browser. Open Mermaid to Image once and choose Download Browser, then try again.",
      );
    }
    throw error;
  }

  try {
    await dependencies.copyGeneratedImage({
      format: result.format,
      imagePath: result.outputPath,
      svgRasterStrategy: result.svgRasterStrategy,
    });
    await dependencies.openInPreview(result.outputPath);
  } catch (error) {
    if (error instanceof BrowserBootstrapRequiredError) {
      throw new Error(
        "This SVG image copy needs a browser. Open Mermaid to Image once and choose Download Browser, then try again.",
      );
    }
    throw error;
  }

  return {
    outputPath: result.outputPath,
    format: result.format,
    engine: result.engine,
    message: `Mermaid diagram generated successfully.\n\nRenderer: ${result.engine}\n\n**Full size:** [Open in Preview](${pathToFileURL(result.outputPath).toString()})`,
  };
}
