import PDFDocument from "pdfkit/js/pdfkit.standalone";
import SVGtoPDF from "svg-to-pdfkit";
import type { OutputFormat } from "../types";

export const toPdf: OutputFormat = {
  id: "pdf",
  label: "PDF",
  extension: "pdf",
  options: [],
  async write(source) {
    if (!source.svg) throw new Error("PDF output needs an SVG input");
    const { text, width, height } = source.svg;

    // One page exactly the size of the artwork; paths stay vector.
    const doc = new PDFDocument({ size: [width, height], margin: 0 });
    const chunks: Buffer[] = [];
    const done = new Promise<Uint8Array>((resolve, reject) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    SVGtoPDF(doc, text, 0, 0, { width, height, assumePt: true, preserveAspectRatio: "xMidYMid meet" });
    doc.end();
    return done;
  },
};
