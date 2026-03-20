import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";

export function toCamelCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

export async function generatePDF(content: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Path to the bundled font in assets/fonts
      const fontPath = path.join(environment.assetsPath, "fonts", "Roboto-Regular.ttf");

      if (!fs.existsSync(fontPath)) {
        reject(new Error(`Font not found at path: ${fontPath}`));
        return;
      }

      const doc = new PDFDocument({ font: fontPath });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc.fontSize(12).text(content, {
        align: "left",
      });
      doc.end();

      stream.on("finish", () => {
        resolve();
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}
