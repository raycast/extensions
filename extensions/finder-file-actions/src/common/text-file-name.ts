import path from "path";

export interface TextFileName {
  baseName: string;
  extension?: string;
}

export function parseTextFileName(rawInput?: string): TextFileName {
  const input = path.basename(rawInput?.trim() || "");

  if (!input || input === "." || input === "..") {
    return { baseName: "untitled", extension: "txt" };
  }

  const dotIndex = input.lastIndexOf(".");

  if (dotIndex > 0) {
    return {
      baseName: input.slice(0, dotIndex),
      extension: input.slice(dotIndex + 1) || undefined,
    };
  }

  if (dotIndex === 0) {
    return { baseName: input };
  }

  return { baseName: input, extension: "txt" };
}
