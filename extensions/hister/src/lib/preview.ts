import { Preview } from "../api";
import { htmlToMarkdown } from "./text";

type VideoPreview = {
  uploader?: string;
  durationFormatted?: string;
  description?: string;
  thumbnail?: string;
  transcript?: string;
};

function parseJSON(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function videoMarkdown(video: VideoPreview): string {
  return [
    video.thumbnail && `![](${video.thumbnail})`,
    [video.uploader, video.durationFormatted].filter(Boolean).join(" · "),
    video.description,
    video.transcript && `## Transcript\n\n${video.transcript}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function previewMarkdown(preview: Preview): string {
  const content = preview.content?.trim() ?? "";
  if (!preview.template) return htmlToMarkdown(content);

  const data = parseJSON(content);
  if (!data || typeof data !== "object") return htmlToMarkdown(content);
  if (preview.template === "video") return videoMarkdown(data as VideoPreview);
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}
