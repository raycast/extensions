import path from "path";
import { ResolvedEngine, RendererMetadata } from "../renderers/types";

interface BuildImagePreviewItemsOptions {
  imagePath: string;
  imageContent: string;
  engineLabel?: ResolvedEngine | null;
  rendererMetadata?: RendererMetadata;
  asciiContent?: string | null;
  beautifulMermaidSourceLabel?: string | null;
}

export type ImagePreviewItemId = "image-preview" | "ascii-preview";

export interface ImagePreviewItemModel {
  id: ImagePreviewItemId;
  title: string;
  subtitle: string;
  markdown: string;
  quickLook?: {
    path: string;
    name: string;
  };
  copyValue?: string;
}

function buildMetadataMarkdown(
  engineLabel: ResolvedEngine | null | undefined,
  beautifulMermaidSourceLabel: string | null | undefined,
  contentMarkdown: string,
): string {
  const metadataLines = [];

  if (engineLabel) {
    metadataLines.push(`Renderer: \`${engineLabel}\``);
  }

  if (beautifulMermaidSourceLabel) {
    metadataLines.push(`beautiful-mermaid: \`${beautifulMermaidSourceLabel}\``);
  }

  return metadataLines.length > 0 ? `${metadataLines.join("\n")}\n\n${contentMarkdown}` : contentMarkdown;
}

export function buildImagePreviewItems({
  imagePath,
  imageContent,
  engineLabel,
  rendererMetadata,
  asciiContent,
  beautifulMermaidSourceLabel,
}: BuildImagePreviewItemsOptions): ImagePreviewItemModel[] {
  const items: ImagePreviewItemModel[] = [
    {
      id: "image-preview",
      title: "Image",
      subtitle: "",
      markdown: buildMetadataMarkdown(
        engineLabel,
        null,
        `${rendererMetadata ? `Version: \`${rendererMetadata.version}\` · Theme: \`${rendererMetadata.theme}\`\n\nExperimental SVG renderer. Preview and Copy Image currently require Chrome/Chromium.\n\n${rendererMetadata.warnings.map((warning) => `> ${warning}`).join("\n\n")}\n\n` : ""}![Mermaid Diagram](${imageContent})`,
      ),
      quickLook: {
        path: imagePath,
        name: path.basename(imagePath),
      },
    },
  ];

  if (asciiContent) {
    items.push({
      id: "ascii-preview",
      title: "ASCII",
      subtitle: "",
      markdown: buildMetadataMarkdown("beautiful", beautifulMermaidSourceLabel, `\`\`\`text\n${asciiContent}\n\`\`\``),
      copyValue: asciiContent,
    });
  }

  return items;
}
