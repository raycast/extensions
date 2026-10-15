// Builds assets/bricks-raycast-helper.zip from wordpress-plugin/bricks-raycast-helper, ready to
// upload under Plugins › Add New › Upload Plugin. Bricks Site Health hands this file to users whose
// helper is missing or outdated.
//
//   node scripts/helper-zip.js          writes the zip
//   node scripts/helper-zip.js --check  fails if the committed zip is out of date (used by publish)
//
// No dependencies: a minimal deflate zip with fixed timestamps, so the same source always gives
// the same bytes.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SOURCE = path.join("wordpress-plugin", "bricks-raycast-helper");
const TARGET = path.join("assets", "bricks-raycast-helper.zip");

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function files(dir, prefix) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      const name = `${prefix}/${entry.name}`;
      return entry.isDirectory() ? files(full, name) : [{ name, data: fs.readFileSync(full) }];
    });
}

function buildZip() {
  // 2026-01-01 00:00 in DOS format.
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files(SOURCE, "bricks-raycast-helper")) {
    const name = Buffer.from(file.name, "utf8");
    const compressed = zlib.deflateRawSync(file.data, { level: 9 });
    const crc = crc32(file.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + compressed.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length / 2, 8);
  end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, end]);
}

const zip = buildZip();
if (process.argv.includes("--check")) {
  const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET) : Buffer.alloc(0);
  if (!current.equals(zip)) {
    console.error(`${TARGET} is out of date with ${SOURCE}. Run \`npm run helper-zip\` and commit it.`);
    process.exit(1);
  }
} else {
  fs.writeFileSync(TARGET, zip);
  console.log(`Wrote ${TARGET} (${Math.round(zip.length / 1024)} KB)`);
}
