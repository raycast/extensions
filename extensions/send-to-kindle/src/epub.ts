import crypto from "crypto";

type EpubOptions = {
  title: string;
  author: string;
  language: string;
  bodyHtml: string;
  resources?: EpubResource[];
  coverResource?: EpubResource;
  includeTitleInContent?: boolean;
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

export type EpubResource = {
  id: string;
  href: string;
  mediaType: string;
  data: Buffer;
  properties?: string;
};

export async function buildEpubBuffer(options: EpubOptions): Promise<Buffer> {
  const title = options.title?.trim() || "Article";
  const author = options.author?.trim() || "Inconnu";
  const language = options.language?.trim() || "en";
  const bodyHtml = options.bodyHtml || "";
  const resources = options.resources ?? [];
  const coverResource = options.coverResource;
  const includeTitleInContent = options.includeTitleInContent ?? true;
  const uuid = crypto.randomUUID();

  const mimetype = Buffer.from("application/epub+zip", "utf8");
  const containerXml = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n` +
      `  <rootfiles>\n` +
      `    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n` +
      `  </rootfiles>\n` +
      `</container>\n`,
    "utf8",
  );
  const allResources = coverResource ? [coverResource, ...resources] : resources;
  const manifestItems = allResources
    .map(
      (resource) =>
        `    <item id="${escapeHtml(resource.id)}" href="${escapeHtml(resource.href)}" media-type="${escapeHtml(
          resource.mediaType,
        )}"${resource.properties ? ` properties="${escapeHtml(resource.properties)}"` : ""}/>`,
    )
    .join("\n");
  const manifestBlock = manifestItems ? `${manifestItems}\n` : "";
  const coverMeta = coverResource ? `    <meta name="cover" content="${escapeHtml(coverResource.id)}"/>\n` : "";
  const coverManifest = coverResource
    ? `    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`
    : "";
  const coverSpine = coverResource ? `    <itemref idref="cover"/>\n` : "";
  const contentOpf = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">\n` +
      `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
      `    <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>\n` +
      `    <dc:title>${escapeHtml(title)}</dc:title>\n` +
      `    <dc:language>${escapeHtml(language)}</dc:language>\n` +
      `    <dc:creator>${escapeHtml(author)}</dc:creator>\n` +
      coverMeta +
      `  </metadata>\n` +
      `  <manifest>\n` +
      `    <item id="nav" properties="nav" href="nav.xhtml" media-type="application/xhtml+xml"/>\n` +
      coverManifest +
      `    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>\n` +
      manifestBlock +
      `  </manifest>\n` +
      `  <spine>\n` +
      coverSpine +
      `    <itemref idref="chapter"/>\n` +
      `  </spine>\n` +
      `</package>\n`,
    "utf8",
  );
  const navXhtml = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeHtml(
        language,
      )}">\n` +
      `  <head>\n` +
      `    <title>${escapeHtml(title)}</title>\n` +
      `  </head>\n` +
      `  <body>\n` +
      `    <nav epub:type="toc" id="toc">\n` +
      `      <ol>\n` +
      `        <li><a href="chapter.xhtml">${escapeHtml(title)}</a></li>\n` +
      `      </ol>\n` +
      `    </nav>\n` +
      `  </body>\n` +
      `</html>\n`,
    "utf8",
  );
  const chapterXhtml = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeHtml(language)}">\n` +
      `  <head>\n` +
      `    <title>${escapeHtml(title)}</title>\n` +
      `    <meta charset="UTF-8" />\n` +
      `    <style>\n` +
      `      h1 { font-size: 1.2em; margin: 0 0 0.6em 0; line-height: 1.2; }\n` +
      `      header { margin: 0; }\n` +
      `    </style>\n` +
      `  </head>\n` +
      `  <body>\n` +
      (includeTitleInContent ? `    <header>\n` + `      <h1>${escapeHtml(title)}</h1>\n` + `    </header>\n` : "") +
      `    <article>\n` +
      `${bodyHtml}\n` +
      `    </article>\n` +
      `  </body>\n` +
      `</html>\n`,
    "utf8",
  );

  const coverXhtml = coverResource
    ? Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeHtml(language)}">\n` +
          `  <head>\n` +
          `    <title>${escapeHtml(title)}</title>\n` +
          `    <meta charset="UTF-8" />\n` +
          `    <style>\n` +
          `      html, body { margin: 0; padding: 0; height: 100%; }\n` +
          `      img { display: block; width: 100%; height: 100%; object-fit: contain; }\n` +
          `    </style>\n` +
          `  </head>\n` +
          `  <body>\n` +
          `    <img src="${escapeHtml(coverResource.href)}" alt="${escapeHtml(title)}"/>\n` +
          `  </body>\n` +
          `</html>\n`,
        "utf8",
      )
    : null;

  const entries: ZipEntry[] = [
    { name: "mimetype", data: mimetype },
    { name: "META-INF/container.xml", data: containerXml },
    { name: "OEBPS/content.opf", data: contentOpf },
    { name: "OEBPS/nav.xhtml", data: navXhtml },
    ...(coverXhtml ? [{ name: "OEBPS/cover.xhtml", data: coverXhtml }] : []),
    { name: "OEBPS/chapter.xhtml", data: chapterXhtml },
    ...allResources.map((resource) => ({
      name: `OEBPS/${resource.href}`,
      data: resource.data,
    })),
  ];

  return buildZip(entries);
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildZip(entries: ZipEntry[]): Buffer {
  const fileChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);

    fileChunks.push(localHeader, data);

    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuffer.copy(centralHeader, 46);

    centralChunks.push(centralHeader);

    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralChunks);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...fileChunks, centralDirectory, endRecord]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    const index = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ CRC_TABLE[index];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();
