import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import {
  encodeRetinaPreview,
  renderRetinaFrame,
  RETINA_WIDTH,
  RETINA_HEIGHT,
} from "../src/lib/retina-preview.ts";
import { COMPONENTS, previewDuration } from "../src/lib/preview.ts";
import { fromDuration } from "../src/lib/model.ts";

// Minimal lossless PNG writer for reviewing the actual RGBA raster, not a mockup.
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function png(rgba: Uint8Array) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(RETINA_WIDTH);
  header.writeUInt32BE(RETINA_HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((RETINA_WIDTH * 4 + 1) * RETINA_HEIGHT);
  for (let y = 0; y < RETINA_HEIGHT; y++)
    rows.set(
      rgba.subarray(y * RETINA_WIDTH * 4, (y + 1) * RETINA_WIDTH * 4),
      y * (RETINA_WIDTH * 4 + 1) + 1,
    );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const directory = ".artifacts/retina";
mkdirSync(directory, { recursive: true });
const easing = fromDuration(0.5, 0.6);
for (const appearance of ["dark", "light"] as const)
  for (const component of COMPONENTS) {
    const spec = {
      easing,
      duration: previewDuration(easing),
      component,
      appearance,
    };
    const start = performance.now();
    const gif = encodeRetinaPreview(spec, "assets");
    const milliseconds = performance.now() - start;
    const name = `${component.toLowerCase().replaceAll(" ", "-")}-${appearance}`;
    writeFileSync(`${directory}/${name}.gif`, gif);
    writeFileSync(
      `${directory}/${name}.png`,
      png(renderRetinaFrame(spec, spec.duration + 0.3, "assets")),
    );
    if (process.argv.includes("--posters"))
      writeFileSync(
        `assets/preview-${name}.png`,
        png(renderRetinaFrame(spec, spec.duration + 0.3, "assets")),
      );
    console.log(
      JSON.stringify({
        component,
        appearance,
        width: RETINA_WIDTH,
        height: RETINA_HEIGHT,
        frames: 62,
        milliseconds,
        bytes: gif.length,
      }),
    );
  }
