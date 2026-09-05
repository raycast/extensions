import { EmailPayload } from "./types";

function tryDecodeBase64Url(input: string): string {
  try {
    const base64Encoded = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    return atob(base64Encoded + padding);
  } catch {
    return "";
  }
}

function isAttachment(part: EmailPayload): boolean {
  if (!part.headers) return false;
  return part.headers.some(
    (header) =>
      header.name.toLowerCase() === "content-disposition" &&
      (header.value.toLowerCase().startsWith("attachment") || header.value.toLowerCase().includes("filename")),
  );
}

function isMultipart(mimeType: string | undefined): boolean {
  return !!mimeType && mimeType.toLowerCase().startsWith("multipart/");
}

export interface EmailBodies {
  plainText: string;
  htmlText: string;
}

export function extractBodies(payload: EmailPayload): EmailBodies {
  if (!payload) {
    return { plainText: "", htmlText: "" };
  }

  const result: EmailBodies = { plainText: "", htmlText: "" };

  function traverse(part: EmailPayload): void {
    const mimeType = part.mimeType?.toLowerCase() || "";

    if (isMultipart(mimeType) && Array.isArray(part.parts)) {
      for (const child of part.parts) {
        traverse(child);
        if (result.plainText && result.htmlText) {
          // We have both, stop early
          return;
        }
      }
      return;
    }

    if (isAttachment(part)) {
      return;
    }

    const data = part.body?.data;
    if (!data) {
      return;
    }

    const decoded = tryDecodeBase64Url(data);
    if (!decoded) {
      return;
    }

    if (mimeType === "text/plain" && !result.plainText) {
      result.plainText = decoded;
    } else if (mimeType === "text/html" && !result.htmlText) {
      result.htmlText = decoded;
    }
  }

  traverse(payload);
  return result;
}

export function getHeaderValue(payload: EmailPayload, headerName: string): string | undefined {
  return payload.headers?.find((header) => header.name.toLowerCase() === headerName.toLowerCase())?.value;
}
