import fs from "fs/promises";

const READ_CHUNK_SIZE = 4096;

export type PreviewOptions = {
  lineCount: number;
  maxCharacters: number;
};

export async function readBlockPreview(filePath: string, options: PreviewOptions): Promise<string> {
  const safeLineCount = Math.max(1, options.lineCount);
  const safeMaxCharacters = Math.max(1, options.maxCharacters);
  const file = await fs.open(filePath, "r");
  const decoder = new TextDecoder("utf-8");
  const buffer = Buffer.alloc(READ_CHUNK_SIZE);
  let content = "";

  try {
    while (content.length < safeMaxCharacters && getLineCount(content) <= safeLineCount) {
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);

      if (bytesRead === 0) {
        content += decoder.decode();
        break;
      }

      content += decoder.decode(buffer.subarray(0, bytesRead), { stream: true });
    }
  } finally {
    await file.close();
  }

  return trimPreview(content, safeLineCount, safeMaxCharacters);
}

function trimPreview(content: string, lineCount: number, maxCharacters: number): string {
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedContent.split("\n");
  const lineTrimmedContent = lines.slice(0, lineCount).join("\n");

  if (lineTrimmedContent.length <= maxCharacters) {
    return lineTrimmedContent;
  }

  return lineTrimmedContent.slice(0, maxCharacters);
}

function getLineCount(content: string): number {
  return content.split(/\r\n|\r|\n/).length;
}
