import { isCdnHackclubUrl, isCdnUploadableUrl } from "./clipboardResolver";

export type UploadFileInputResolution =
  { kind: "empty" } | { kind: "already-cdn-link" } | { kind: "url"; url: string } | { kind: "file"; path: string };

export function stripSurroundingQuotes(value: string): string {
  const quoteChars = ['"', "'", "`"];
  if (value.length >= 2 && quoteChars.includes(value[0]) && value[value.length - 1] === value[0]) {
    return value.slice(1, -1);
  }
  return value;
}

export function resolveUploadFileInput(filePath: string | undefined, rawPathText: string): UploadFileInputResolution {
  const normalizedPathText = stripSurroundingQuotes(rawPathText.trim());

  if (!filePath && !normalizedPathText) {
    return { kind: "empty" };
  }

  if (!filePath && isCdnHackclubUrl(normalizedPathText)) {
    return { kind: "already-cdn-link" };
  }

  if (!filePath && isCdnUploadableUrl(normalizedPathText)) {
    return { kind: "url", url: normalizedPathText };
  }

  return { kind: "file", path: filePath ?? normalizedPathText };
}
