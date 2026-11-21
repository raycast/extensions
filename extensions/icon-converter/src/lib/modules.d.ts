declare module "heic-decode" {
  export default function decode(input: {
    buffer: Uint8Array;
  }): Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
}

declare module "imagetracerjs" {
  const ImageTracer: {
    imagedataToSVG(
      image: { width: number; height: number; data: Uint8ClampedArray },
      options?: Record<string, number | boolean | string>,
    ): string;
  };
  export default ImageTracer;
}

declare module "pdfkit/js/pdfkit.standalone" {
  import PDFDocument from "pdfkit";
  export default PDFDocument;
}

declare module "svg-to-pdfkit" {
  export default function SVGtoPDF(
    doc: PDFKit.PDFDocument,
    svg: string,
    x?: number,
    y?: number,
    options?: Record<string, unknown>,
  ): void;
}
