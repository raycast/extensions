export type TextTemplateSegment = {
  readonly kind: "text";
  readonly content: string;
};

export type AiTemplateSegment = {
  readonly kind: "ai";
  readonly id: string;
  readonly prompt: string;
};

export type TemplateSegment = TextTemplateSegment | AiTemplateSegment;

export type TemplateParseErrorCode = "unexpected-ai-close" | "unclosed-ai" | "nested-ai" | "empty-ai";

export class TemplateParseError extends Error {
  readonly code: TemplateParseErrorCode;
  readonly offset: number;

  constructor(code: TemplateParseErrorCode, message: string, offset: number) {
    super(message);
    this.name = "TemplateParseError";
    this.code = code;
    this.offset = offset;
  }
}

const OPEN_TAG = "<ai>";
const CLOSE_TAG = "</ai>";

export function parseTemplate(content: string): readonly TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let cursor = 0;
  let aiFieldNumber = 1;

  while (cursor < content.length) {
    const openOffset = content.indexOf(OPEN_TAG, cursor);
    const strayCloseOffset = content.indexOf(CLOSE_TAG, cursor);

    if (strayCloseOffset !== -1 && (openOffset === -1 || strayCloseOffset < openOffset)) {
      throw new TemplateParseError("unexpected-ai-close", "Unexpected </ai> closing tag", strayCloseOffset);
    }

    if (openOffset === -1) {
      appendText(segments, content.slice(cursor));
      break;
    }

    appendText(segments, content.slice(cursor, openOffset));

    const promptOffset = openOffset + OPEN_TAG.length;
    const closeOffset = content.indexOf(CLOSE_TAG, promptOffset);
    if (closeOffset === -1) {
      throw new TemplateParseError("unclosed-ai", "Unclosed <ai> field", openOffset);
    }

    const nestedOffset = content.indexOf(OPEN_TAG, promptOffset);
    if (nestedOffset !== -1 && nestedOffset < closeOffset) {
      throw new TemplateParseError("nested-ai", "Nested <ai> fields are not supported", nestedOffset);
    }

    const prompt = content.slice(promptOffset, closeOffset);
    if (prompt.trim().length === 0) {
      throw new TemplateParseError("empty-ai", "AI fields cannot be empty", openOffset);
    }

    segments.push({ kind: "ai", id: `ai-field-${aiFieldNumber}`, prompt });
    aiFieldNumber += 1;
    cursor = closeOffset + CLOSE_TAG.length;
  }

  if (content.length === 0) {
    return [{ kind: "text", content: "" }];
  }

  return segments;
}

function appendText(segments: TemplateSegment[], content: string): void {
  if (content.length > 0) {
    segments.push({ kind: "text", content });
  }
}
