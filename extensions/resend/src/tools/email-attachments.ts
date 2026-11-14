import fs from "fs";
import path from "path";

export type AttachmentReference = {
  kind: "hosted" | "local";
  filename: string;
  source: string;
};

export function parseAttachmentReferences(value?: string): AttachmentReference[] {
  if (!value) return [];

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const hostedSource = line.startsWith("url:")
        ? line.substring(4).trim()
        : line.match(/^https?:\/\//i)
          ? line
          : undefined;

      if (hostedSource !== undefined) {
        let url: URL;
        try {
          url = new URL(hostedSource);
        } catch {
          throw new Error(`Invalid hosted attachment URL: ${hostedSource || "(empty)"}`);
        }

        if (url.protocol !== "https:") {
          throw new Error(`Hosted attachment URLs must use HTTPS: ${hostedSource}`);
        }

        return {
          kind: "hosted",
          filename: path.basename(url.pathname) || "attachment",
          source: url.toString(),
        };
      }

      if (!path.isAbsolute(line)) {
        throw new Error(`Local attachment paths must be absolute: ${line}`);
      }

      if (!fs.existsSync(line) || !fs.lstatSync(line).isFile()) {
        throw new Error(`Attachment file not found: ${line}`);
      }

      return { kind: "local", filename: path.basename(line), source: line };
    });
}
