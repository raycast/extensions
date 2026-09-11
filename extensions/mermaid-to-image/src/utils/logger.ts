const BLOCKED_METADATA_KEYS = new Set([
  "mermaidCode",
  "clipboardText",
  "selectedText",
  "svgContent",
  "asciiContent",
  "imageContent",
  "code",
  "content",
]);

export type OperationalLogMetadata = Record<string, string | number | boolean | null | undefined>;

function sanitizeOperationalMetadata(metadata: Record<string, unknown>): OperationalLogMetadata {
  return Object.entries(metadata).reduce<OperationalLogMetadata>((safeMetadata, [key, value]) => {
    if (BLOCKED_METADATA_KEYS.has(key)) {
      return safeMetadata;
    }

    if (value === null || value === undefined) {
      return safeMetadata;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safeMetadata[key] = value;
    }

    return safeMetadata;
  }, {});
}

export function logOperationalEvent(event: string, metadata: Record<string, unknown> = {}): void {
  console.info(`[mermaid-to-image] ${event}`, sanitizeOperationalMetadata(metadata));
}

export function logOperationalError(event: string, error: unknown, metadata: Record<string, unknown> = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[mermaid-to-image] ${event}`, sanitizeOperationalMetadata({ ...metadata, message }));
}
