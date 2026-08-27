import { LocalStorage, Clipboard } from "@raycast/api";
import * as PImage from "pureimage";
import { mkdir, readFile, copyFile, rm } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Signature } from "../types";

const SIGNATURES_KEY = "esignature_signatures";

const SIGNATURES_DIR = path.join(
  process.env.HOME!,
  "Library/Application Support/raycast/signatures",
);

// Only ever delete images this extension owns — legacy records may still
// point at the user's original upload outside the support directory.
function isExtensionOwnedImage(imagePath: string): boolean {
  const relative = path.relative(SIGNATURES_DIR, path.resolve(imagePath));
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

export async function getSignatures(): Promise<Signature[]> {
  try {
    const signaturesJson = await LocalStorage.getItem<string>(SIGNATURES_KEY);
    return signaturesJson ? JSON.parse(signaturesJson) : [];
  } catch (error) {
    console.error("Failed to get signatures:", error);
    return [];
  }
}

export async function saveSignature(
  signature: Omit<Signature, "id"> & { id?: string },
): Promise<void> {
  try {
    const signatures = await getSignatures();

    // An id that matches an existing record means this is an edit: replace it
    // in place rather than pushing a duplicate record (and a duplicate image).
    const existingIndex = signature.id
      ? signatures.findIndex((s) => s.id === signature.id)
      : -1;
    const existing = existingIndex >= 0 ? signatures[existingIndex] : undefined;

    const newSignature: Signature = {
      ...signature,
      id: existing?.id ?? generateId(),
    };

    const outDir = SIGNATURES_DIR;
    await mkdir(outDir, { recursive: true });

    //  render to PNG and convert to image type
    if (signature.type === "text" && signature.content) {
      const fontName = signature.font || "GreatVibes-Regular";
      const fontsDir = path.join(__dirname, "assets", "fonts");
      const fontFile =
        fontName === "Pacifico-Regular"
          ? path.join(fontsDir, "Pacifico-Regular.ttf")
          : path.join(fontsDir, "GreatVibes-Regular.ttf");

      const font = PImage.registerFont(fontFile, fontName);
      font.loadSync();
      const fontSize = 64;
      const padding = Math.ceil(fontSize * 0.2);
      const text = signature.content;

      const measureImg = PImage.make(1, 1);
      const measureCtx = measureImg.getContext("2d");
      measureCtx.font = `${fontSize}pt "${fontName}"`;
      const metrics = PImage.measureText(measureCtx, text);
      const width = Math.ceil(metrics.width + padding * 2);
      const height = Math.ceil(
        metrics.emHeightAscent + metrics.emHeightDescent + padding * 5,
      );
      const img = PImage.make(width, height);

      const ctx = img.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#000";
      ctx.font = `${fontSize}pt "${fontName}"`;
      ctx.textBaseline = "top";
      ctx.fillText(text, padding, padding);

      const outPath = path.join(outDir, `${newSignature.id}.png`);
      await new Promise<void>((resolve, reject) => {
        const stream = createWriteStream(outPath);
        PImage.encodePNGToStream(img, stream).then(resolve).catch(reject);
      });

      newSignature.imagePath = outPath;
      newSignature.type = "image";
    } else if (signature.type === "image" && signature.imagePath) {
      // BUG FIX: Copy the uploaded image into the safe Raycast directory
      const sourcePath = path.resolve(signature.imagePath);
      const extension = path.extname(signature.imagePath) || ".png";
      const outPath = path.join(outDir, `${newSignature.id}${extension}`);
      // Editing without picking a new file leaves the source pointing at the
      // copy we already own, so there is nothing to copy. (macOS tolerates a
      // file being copied onto itself; not worth depending on.)
      if (sourcePath !== outPath) {
        await copyFile(signature.imagePath, outPath);
      }
      newSignature.imagePath = outPath;
    }

    if (existingIndex >= 0) {
      signatures[existingIndex] = newSignature;
    } else {
      signatures.push(newSignature);
    }
    await LocalStorage.setItem(SIGNATURES_KEY, JSON.stringify(signatures));

    // An edit can leave the previous image behind — a different upload, or a
    // switch from image to text that renders to a different extension.
    // Best-effort for the same reason as in deleteSignature.
    if (
      existing?.imagePath &&
      existing.imagePath !== newSignature.imagePath &&
      isExtensionOwnedImage(existing.imagePath)
    ) {
      try {
        await rm(existing.imagePath, { force: true });
      } catch (error) {
        console.error("Failed to remove replaced signature image:", error);
      }
    }
  } catch (error) {
    console.error("Failed to save signature:", error);
    throw error;
  }
}

export async function deleteSignature(id: string): Promise<void> {
  try {
    const signatures = await getSignatures();
    const filtered = signatures.filter((s) => s.id !== id);
    await LocalStorage.setItem(SIGNATURES_KEY, JSON.stringify(filtered));

    // Remove the image this extension wrote, so deleted signature data does
    // not linger on disk. Do this after the record is gone: an orphaned file
    // is recoverable, a record pointing at a missing file is not.
    //
    // Best-effort on purpose. The record is already deleted, so the operation
    // has succeeded from the caller's point of view; throwing here would skip
    // the caller's list refresh and leave a deleted signature on screen.
    const removed = signatures.find((s) => s.id === id);
    if (removed?.imagePath && isExtensionOwnedImage(removed.imagePath)) {
      try {
        await rm(removed.imagePath, { force: true });
      } catch (error) {
        console.error("Failed to delete signature image:", error);
      }
    }
  } catch (error) {
    console.error("Failed to delete signature:", error);
    throw error;
  }
}

export async function copySignatureToClipboard(
  signature: Signature,
): Promise<void> {
  try {
    switch (signature.type) {
      case "text":
        if (signature.content) {
          const familyMap: Record<string, string> = {
            "GreatVibes-Regular": `"Great Vibes", cursive`,
            "Pacifico-Regular": `"Pacifico", cursive`,
          };
          const fontFamily = familyMap[signature.font || ""] || "cursive";
          const html = `<span style="font-family: ${fontFamily}; font-size: 24px;">${signature.content}</span>`;
          await Clipboard.copy({ html, text: signature.content });
        }
        break;

      case "image":
        if (signature.imagePath) {
          const buffer = await readFile(signature.imagePath);
          const base64 = buffer.toString("base64");
          await Clipboard.copy({
            html: `<img src="data:image/png;base64,${base64}" style="max-height:100px;" />`,
            file: signature.imagePath,
          });
        }
        break;

      default:
        throw new Error("Unknown signature type");
    }
  } catch (error) {
    console.error("Failed to copy signature:", error);
    throw error;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
