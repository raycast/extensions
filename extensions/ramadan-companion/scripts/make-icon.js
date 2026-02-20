const fs = require("fs");
const zlib = require("zlib");

const width = 512,
    height = 512;

function crc32(buf) {
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ c) >>> 1 : c >>> 1;
        table[i] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = (table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const typeBytes = Buffer.from(type, "ascii");
    const crcVal = crc32(Buffer.concat([typeBytes, data]));
    const out = Buffer.alloc(4 + 4 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    typeBytes.copy(out, 4);
    data.copy(out, 8);
    out.writeUInt32BE(crcVal, 8 + data.length);
    return out;
}

function writePNG(w, h, pixels) {
    const rowSize = w * 4;
    const rawData = Buffer.alloc(h * (rowSize + 1));
    for (let y = 0; y < h; y++) {
        rawData[y * (rowSize + 1)] = 0;
        for (let x = 0; x < w; x++) {
            const src = (y * w + x) * 4;
            const dst = y * (rowSize + 1) + 1 + x * 4;
            rawData[dst] = pixels[src];
            rawData[dst + 1] = pixels[src + 1];
            rawData[dst + 2] = pixels[src + 2];
            rawData[dst + 3] = pixels[src + 3];
        }
    }
    const compressed = zlib.deflateSync(rawData, { level: 6 });
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

const pixels = Buffer.alloc(width * height * 4);
const cx = 256,
    cy = 256,
    R = 170,
    r = 130,
    shift = 100;

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dx = x - cx,
            dy = y - cy;
        const inOuter = dx * dx + dy * dy <= R * R;
        const dx2 = x - (cx + shift),
            dy2 = y - cy;
        const inInner = dx2 * dx2 + dy2 * dy2 <= r * r;
        if (inOuter && !inInner) {
            pixels[idx] = 240;
            pixels[idx + 1] = 192;
            pixels[idx + 2] = 64;
            pixels[idx + 3] = 255;
        } else {
            pixels[idx] = 26;
            pixels[idx + 1] = 26;
            pixels[idx + 2] = 46;
            pixels[idx + 3] = 255;
        }
    }
}

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/extension-icon.png", writePNG(width, height, pixels));
console.log("Icon created: assets/extension-icon.png");
