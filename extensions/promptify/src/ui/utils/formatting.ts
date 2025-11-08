import { truncateText, escapeMarkdown } from "../../utils/helpers";

export function formatPromptForPreview(prompt: string, maxLength = 500): string {
  let formatted = prompt.trim();

  // Truncate if too long
  if (formatted.length > maxLength) {
    formatted = truncateText(formatted, maxLength);
  }

  // Escape markdown for safe display
  return escapeMarkdown(formatted);
}

export function formatJsonExport(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatPresetDescription(preset: string): string {
  switch (preset) {
    case "general":
      return "Structure any prompt with clear objectives and context";
    case "images":
      return "Optimize for image generation (style, composition, lighting)";
    case "code":
      return "Technical prompts with requirements and best practices";
    default:
      return "Custom preset";
  }
}

export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function highlightText(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, "**$1**");
}
