import { LocalStorage, Clipboard } from "@raycast/api";
import * as PImage from "pureimage";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { readFile } from "fs/promises";
import { Signature } from "../types";

const SIGNATURES_KEY = "esignature_signatures";

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
  signature: Omit<Signature, "id">,
): Promise<void> {
  try {
    const signatures = await getSignatures();
    const newSignature: Signature = {
      ...signature,
      id: generateId(),
    };

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

      const outDir = path.join(
        process.env.HOME!,
        "Library/Application Support/raycast/signatures",
      );
      await mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, `${newSignature.id}.png`);
      await new Promise<void>((resolve, reject) => {
        const stream = createWriteStream(outPath);
        PImage.encodePNGToStream(img, stream).then(resolve).catch(reject);
      });

      newSignature.imagePath = outPath;
      newSignature.type = "image";
    }

    signatures.push(newSignature);
    await LocalStorage.setItem(SIGNATURES_KEY, JSON.stringify(signatures));
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
