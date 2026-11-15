import ImageTracer from "imagetracerjs";
import { fitInside } from "../image";
import type { OutputFormat } from "../types";

/** Tracing cost grows with pixel count; icons and logos never need more than this. */
const MAX_TRACE_SIDE = 1024;

export const toSvg: OutputFormat = {
  id: "svg",
  label: "SVG",
  extension: "svg",
  options: ["colors"],
  async write(source, options) {
    const full = await source.raster();
    const img = fitInside(full, MAX_TRACE_SIDE);
    const svg: string = ImageTracer.imagedataToSVG(img, {
      numberofcolors: options.colors ?? 16,
      viewbox: true,
      // More quantisation passes and no minimum colour share, so thin outlines keep their colour.
      colorquantcycles: 10,
      mincolorratio: 0,
      // A 1px same-colour stroke closes hairline gaps between neighbouring shapes.
      strokewidth: 1,
    });
    // Keep the original pixel size as the default display size, scalable via viewBox.
    const sized = svg.replace("<svg ", `<svg width="${full.width}" height="${full.height}" `);
    return Buffer.from(sized, "utf8");
  },
};
