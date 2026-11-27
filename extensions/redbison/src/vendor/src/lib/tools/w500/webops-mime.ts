/**
 * MIME type (media type) lookup. Types follow the IANA Media Types registry
 * (https://www.iana.org/assignments/media-types) and, where a format has no
 * registered type, the value browsers and servers actually send (marked
 * registered: false). Cross-checked against the mime-db package.
 */

import { msg } from '../../msg';

export type MimeCategory = 'text' | 'web' | 'image' | 'audio' | 'video' | 'font' | 'document' | 'archive' | 'data' | 'code' | 'application';

export type MimeEntry = {
  /** Extensions without the dot, lowercase. The first is the usual one. */
  ext: string[];
  mime: string;
  name: string;
  category: MimeCategory;
  /** IANA-registered type (true) or a de facto / vendor type (false). */
  registered: boolean;
  /** Older or alternative types you may still meet. */
  aliases?: string[];
  /** Defining spec, if useful. */
  spec?: string;
  note?: string;
};

const M = (ext: string | string[], mime: string, name: string, category: MimeCategory, extra: Partial<Omit<MimeEntry, 'ext' | 'mime' | 'name' | 'category'>> = {}): MimeEntry => ({
  ext: Array.isArray(ext) ? ext : [ext],
  mime,
  name,
  category,
  registered: extra.registered ?? true,
  aliases: extra.aliases,
  spec: extra.spec,
  note: extra.note,
});

export const MIME_TYPES: MimeEntry[] = [
  // Web
  M(['html', 'htm'], 'text/html', msg('HTML document'), 'web', { spec: 'WHATWG HTML' }),
  M('css', 'text/css', msg('Cascading Style Sheets'), 'web', { spec: 'RFC 2318' }),
  M(['js', 'mjs'], 'text/javascript', msg('JavaScript'), 'web', { spec: 'RFC 9239', aliases: ['application/javascript', 'application/x-javascript'], note: msg('RFC 9239 (2022) made text/javascript the only recommended type and marked application/javascript obsolete.') }),
  M('json', 'application/json', msg('JSON'), 'data', { spec: 'RFC 8259', note: msg('No charset parameter: JSON is always UTF-8 on the wire.') }),
  M('jsonld', 'application/ld+json', msg('JSON-LD'), 'data', { spec: 'W3C JSON-LD 1.1' }),
  M('map', 'application/json', msg('Source map'), 'web', { note: msg('Source maps have no type of their own; servers send application/json.') }),
  M('webmanifest', 'application/manifest+json', msg('Web app manifest'), 'web', { spec: 'W3C Web App Manifest' }),
  M('wasm', 'application/wasm', msg('WebAssembly binary'), 'web', { note: msg('WebAssembly.instantiateStreaming refuses any other type.') }),
  M('xhtml', 'application/xhtml+xml', msg('XHTML document'), 'web', { spec: 'RFC 3236' }),
  M('ics', 'text/calendar', msg('iCalendar'), 'text', { spec: 'RFC 5545' }),
  M('vcf', 'text/vcard', msg('vCard contact'), 'text', { spec: 'RFC 6350', aliases: ['text/x-vcard'] }),
  M('rss', 'application/rss+xml', msg('RSS feed'), 'web', { registered: false, note: msg('Widely used but never registered with IANA. application/xml also works.') }),
  M('atom', 'application/atom+xml', msg('Atom feed'), 'web', { spec: 'RFC 4287' }),
  M('appcache', 'text/cache-manifest', msg('Application cache manifest'), 'web', { note: msg('AppCache was removed from browsers.') }),

  // Text and data
  M(['txt', 'text', 'log'], 'text/plain', msg('Plain text'), 'text', { spec: 'RFC 2046' }),
  M('csv', 'text/csv', msg('Comma-separated values'), 'data', { spec: 'RFC 4180' }),
  M('tsv', 'text/tab-separated-values', msg('Tab-separated values'), 'data'),
  M(['md', 'markdown'], 'text/markdown', msg('Markdown'), 'text', { spec: 'RFC 7763' }),
  M('xml', 'application/xml', msg('XML document'), 'data', { spec: 'RFC 7303', aliases: ['text/xml'], note: msg('RFC 7303 treats text/xml as an alias; application/xml is preferred.') }),
  M('xsl', 'application/xslt+xml', msg('XSLT stylesheet'), 'data', { spec: 'W3C XSLT' }),
  M(['yaml', 'yml'], 'application/yaml', msg('YAML'), 'data', { spec: 'RFC 9512', aliases: ['text/yaml', 'application/x-yaml', 'text/x-yaml'], note: msg('Registered by RFC 9512 in 2024; older software sends application/x-yaml.') }),
  M('toml', 'application/toml', msg('TOML'), 'data', { note: msg('Older tools may send text/x-toml or application/x-toml.') }),
  M('rtf', 'application/rtf', msg('Rich Text Format'), 'document', { aliases: ['text/rtf'] }),
  M('sql', 'application/sql', msg('SQL script'), 'code', { spec: 'RFC 6922' }),
  M('ndjson', 'application/x-ndjson', msg('Newline-delimited JSON'), 'data', { registered: false, aliases: ['application/jsonl'] }),
  M('geojson', 'application/geo+json', msg('GeoJSON'), 'data', { spec: 'RFC 7946' }),
  M('gpx', 'application/gpx+xml', msg('GPS exchange format'), 'data', { registered: false }),
  M('kml', 'application/vnd.google-earth.kml+xml', msg('Google Earth KML'), 'data'),
  M('srt', 'application/x-subrip', msg('SubRip subtitles'), 'text', { registered: false }),
  M('vtt', 'text/vtt', msg('WebVTT subtitles'), 'text', { spec: 'W3C WebVTT', note: msg('The <track> element needs this exact type.') }),

  // Code (served as text)
  M('py', 'text/x-python', msg('Python source'), 'code', { registered: false }),
  M('java', 'text/x-java-source', msg('Java source'), 'code', { registered: false }),
  M(['c', 'h'], 'text/x-c', msg('C source'), 'code', { registered: false }),
  M('sh', 'application/x-sh', msg('Shell script'), 'code', { registered: false }),
  M('php', 'application/x-httpd-php', msg('PHP script'), 'code', { registered: false, note: msg('Servers execute .php rather than serving it; this type is what Apache uses internally.') }),
  M('ts', 'video/mp2t', msg('MPEG transport stream'), 'video', { note: msg('The .ts extension is MPEG-TS video by default on servers. TypeScript source has no registered type; tools use text/x-typescript or application/typescript.') }),

  // Images
  M('png', 'image/png', msg('PNG image'), 'image', { spec: 'W3C PNG' }),
  M(['jpg', 'jpeg', 'jpe', 'jfif'], 'image/jpeg', msg('JPEG image'), 'image', { aliases: ['image/pjpeg'], note: msg('There is no image/jpg. Browsers tolerate it but it is not a valid type.') }),
  M('gif', 'image/gif', msg('GIF image'), 'image'),
  M('webp', 'image/webp', msg('WebP image'), 'image', { spec: 'RFC 9649' }),
  M('avif', 'image/avif', msg('AVIF image'), 'image'),
  M('svg', 'image/svg+xml', msg('SVG vector image'), 'image', { spec: 'W3C SVG', note: msg('Without this exact type, <img> will not render an SVG.') }),
  M('svgz', 'image/svg+xml', msg('Compressed SVG'), 'image', { note: msg('Also needs Content-Encoding: gzip.') }),
  M('ico', 'image/vnd.microsoft.icon', msg('Windows icon'), 'image', { aliases: ['image/x-icon'], note: msg('image/x-icon is far more common in the wild and works everywhere.') }),
  M('bmp', 'image/bmp', msg('Bitmap image'), 'image', { aliases: ['image/x-ms-bmp'] }),
  M(['tif', 'tiff'], 'image/tiff', msg('TIFF image'), 'image', { spec: 'RFC 3302' }),
  M('heic', 'image/heic', msg('HEIC image (HEIF with HEVC)'), 'image'),
  M('heif', 'image/heif', msg('HEIF image'), 'image'),
  M('jxl', 'image/jxl', msg('JPEG XL image'), 'image'),
  M('apng', 'image/apng', msg('Animated PNG'), 'image', { note: msg('image/png also works, and is what most servers send.') }),
  M('psd', 'image/vnd.adobe.photoshop', msg('Photoshop document'), 'image'),

  // Audio
  M('mp3', 'audio/mpeg', msg('MP3 audio'), 'audio', { spec: 'RFC 3003', aliases: ['audio/mp3'] }),
  M('wav', 'audio/wav', msg('WAV audio'), 'audio', { registered: false, aliases: ['audio/x-wav', 'audio/wave', 'audio/vnd.wave'] }),
  M('ogg', 'audio/ogg', msg('Ogg audio'), 'audio', { spec: 'RFC 5334' }),
  M('oga', 'audio/ogg', msg('Ogg audio'), 'audio', { spec: 'RFC 5334' }),
  M('opus', 'audio/ogg', msg('Opus in Ogg'), 'audio', { spec: 'RFC 7845', note: msg('Use audio/ogg; codecs=opus to signal the codec.') }),
  M('flac', 'audio/flac', msg('FLAC audio'), 'audio', { spec: 'RFC 9639', aliases: ['audio/x-flac'] }),
  M(['m4a', 'mp4a'], 'audio/mp4', msg('MPEG-4 audio (AAC)'), 'audio', { spec: 'RFC 4337', aliases: ['audio/x-m4a'] }),
  M('aac', 'audio/aac', msg('AAC audio (ADTS)'), 'audio', { aliases: ['audio/x-aac'] }),
  M('weba', 'audio/webm', msg('WebM audio'), 'audio', { registered: false }),
  M(['mid', 'midi'], 'audio/midi', msg('MIDI'), 'audio', { registered: false, aliases: ['audio/x-midi'] }),
  M(['aiff', 'aif'], 'audio/x-aiff', msg('AIFF audio'), 'audio', { registered: false, aliases: ['audio/aiff'] }),

  // Video
  M('mp4', 'video/mp4', msg('MPEG-4 video'), 'video', { spec: 'RFC 4337' }),
  M('m4v', 'video/x-m4v', msg('Apple MPEG-4 video'), 'video', { registered: false, note: msg('video/mp4 also works for most .m4v files.') }),
  M('webm', 'video/webm', msg('WebM video'), 'video', { registered: false, note: msg('Defined by the WebM project rather than IANA, but universal.') }),
  M('ogv', 'video/ogg', msg('Ogg video'), 'video', { spec: 'RFC 5334' }),
  M('mov', 'video/quicktime', msg('QuickTime movie'), 'video'),
  M('avi', 'video/x-msvideo', msg('AVI video'), 'video', { registered: false }),
  M('mkv', 'video/x-matroska', msg('Matroska video'), 'video', { registered: false, aliases: ['video/matroska'] }),
  M('mpeg', 'video/mpeg', msg('MPEG-1/2 video'), 'video', { spec: 'RFC 2045' }),
  M('3gp', 'video/3gpp', msg('3GPP video'), 'video', { spec: 'RFC 3839' }),
  M('flv', 'video/x-flv', msg('Flash video'), 'video', { registered: false }),
  M('m3u8', 'application/vnd.apple.mpegurl', msg('HLS playlist'), 'video', { aliases: ['application/x-mpegURL', 'audio/mpegurl'], spec: 'RFC 8216' }),
  M('mpd', 'application/dash+xml', msg('MPEG-DASH manifest'), 'video'),

  // Fonts
  M('woff2', 'font/woff2', msg('WOFF2 font'), 'font', { spec: 'RFC 8081', aliases: ['application/font-woff2'] }),
  M('woff', 'font/woff', msg('WOFF font'), 'font', { spec: 'RFC 8081', aliases: ['application/font-woff'] }),
  M('ttf', 'font/ttf', msg('TrueType font'), 'font', { spec: 'RFC 8081', aliases: ['application/x-font-ttf'] }),
  M('otf', 'font/otf', msg('OpenType font'), 'font', { spec: 'RFC 8081', aliases: ['application/x-font-opentype'] }),
  M('eot', 'application/vnd.ms-fontobject', msg('Embedded OpenType font'), 'font', { note: msg('Only old Internet Explorer used EOT.') }),

  // Documents
  M('pdf', 'application/pdf', msg('PDF document'), 'document', { spec: 'RFC 8118' }),
  M('doc', 'application/msword', msg('Word 97-2003 document'), 'document'),
  M('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', msg('Word document'), 'document'),
  M('xls', 'application/vnd.ms-excel', msg('Excel 97-2003 workbook'), 'document'),
  M('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', msg('Excel workbook'), 'document'),
  M('ppt', 'application/vnd.ms-powerpoint', msg('PowerPoint 97-2003 presentation'), 'document'),
  M('pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', msg('PowerPoint presentation'), 'document'),
  M('odt', 'application/vnd.oasis.opendocument.text', msg('OpenDocument text'), 'document'),
  M('ods', 'application/vnd.oasis.opendocument.spreadsheet', msg('OpenDocument spreadsheet'), 'document'),
  M('odp', 'application/vnd.oasis.opendocument.presentation', msg('OpenDocument presentation'), 'document'),
  M('epub', 'application/epub+zip', msg('EPUB e-book'), 'document'),
  M('eml', 'message/rfc822', msg('Email message'), 'document', { spec: 'RFC 5322' }),

  // Archives
  M('zip', 'application/zip', msg('ZIP archive'), 'archive', { aliases: ['application/x-zip-compressed'] }),
  M('gz', 'application/gzip', msg('Gzip file'), 'archive', { spec: 'RFC 6713', aliases: ['application/x-gzip'] }),
  M('tar', 'application/x-tar', msg('Tar archive'), 'archive', { registered: false }),
  M('tgz', 'application/gzip', msg('Gzipped tar archive'), 'archive', { note: msg('A .tar.gz file is served as application/gzip.') }),
  M('bz2', 'application/x-bzip2', msg('Bzip2 file'), 'archive', { registered: false }),
  M('xz', 'application/x-xz', msg('XZ file'), 'archive', { registered: false }),
  M('zst', 'application/zstd', msg('Zstandard file'), 'archive', { spec: 'RFC 8878' }),
  M('7z', 'application/x-7z-compressed', msg('7-Zip archive'), 'archive', { registered: false }),
  M('rar', 'application/vnd.rar', msg('RAR archive'), 'archive', { aliases: ['application/x-rar-compressed'] }),
  M('jar', 'application/java-archive', msg('Java archive'), 'archive'),

  // Applications and binaries
  M(['bin', 'exe', 'dll', 'so', 'iso', 'img', 'dmg'], 'application/octet-stream', msg('Arbitrary binary data'), 'application', { spec: 'RFC 2046', note: msg('The fallback for any unknown binary. Browsers download it rather than display it.') }),
  M('apk', 'application/vnd.android.package-archive', msg('Android package'), 'application', { registered: false }),
  M('deb', 'application/vnd.debian.binary-package', msg('Debian package'), 'application'),
  M('rpm', 'application/x-redhat-package-manager', msg('RPM package'), 'application', { registered: false, aliases: ['application/x-rpm'] }),
  M('msi', 'application/x-msdownload', msg('Windows installer'), 'application', { registered: false, aliases: ['application/x-msi'] }),
  M('swf', 'application/x-shockwave-flash', msg('Flash movie'), 'application', { registered: false, note: msg('Flash Player reached end of life in 2020.') }),
  M('torrent', 'application/x-bittorrent', msg('BitTorrent file'), 'application', { registered: false }),
  M('pem', 'application/x-pem-file', msg('PEM certificate or key'), 'application', { registered: false, note: msg('Apache\'s mime.types maps .pem to application/x-x509-ca-cert instead.') }),
  M('crt', 'application/x-x509-ca-cert', msg('X.509 certificate'), 'application', { aliases: ['application/pkix-cert'], note: msg('application/pkix-cert (RFC 2585) is also used for a single DER certificate.') }),
  M('p12', 'application/x-pkcs12', msg('PKCS #12 keystore'), 'application', { registered: false }),
  M('parquet', 'application/vnd.apache.parquet', msg('Apache Parquet'), 'data'),
  M('sqlite', 'application/vnd.sqlite3', msg('SQLite database'), 'data'),
  M('glb', 'model/gltf-binary', msg('glTF binary 3D model'), 'application'),
  M('gltf', 'model/gltf+json', msg('glTF 3D model'), 'application'),
  M('stl', 'model/stl', msg('STL 3D model'), 'application'),
  M('ipynb', 'application/x-ipynb+json', msg('Jupyter notebook'), 'data', { registered: false }),

  // Form encodings (no extension)
  M([], 'application/x-www-form-urlencoded', msg('URL-encoded form body'), 'web', { spec: 'WHATWG URL', note: msg('Default encoding of an HTML form post.') }),
  M([], 'multipart/form-data', msg('Multipart form body (file uploads)'), 'web', { spec: 'RFC 7578', note: msg('Needs a boundary parameter, which browsers and fetch add for you when the body is FormData.') }),
  M([], 'application/problem+json', msg('Problem Details for HTTP APIs'), 'data', { spec: 'RFC 9457' }),
  M([], 'text/event-stream', msg('Server-sent events'), 'web', { spec: 'WHATWG HTML' }),
  M([], 'application/graphql-response+json', msg('GraphQL over HTTP response'), 'data', { registered: false }),
];

export function normaliseExtension(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.split(/[?#]/)[0];
  const slash = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  if (slash >= 0) s = s.slice(slash + 1);
  const dot = s.lastIndexOf('.');
  if (dot >= 0) s = s.slice(dot + 1);
  return s;
}

/** Look up by extension or file name ("photo.JPG", ".svg", "svg"). Compound .tar.gz is handled. */
export function lookupExtension(input: string): MimeEntry | undefined {
  const raw = input.trim().toLowerCase();
  if (/\.tar\.gz$/.test(raw)) return MIME_TYPES.find((m) => m.ext.includes('tgz'));
  const ext = normaliseExtension(input);
  if (!ext) return undefined;
  return MIME_TYPES.find((m) => m.ext.includes(ext));
}

/** Look up by MIME type, including aliases. Parameters such as "; charset=utf-8" are ignored. */
export function lookupMime(input: string): MimeEntry[] {
  const t = input.trim().toLowerCase().split(';')[0].trim();
  if (!t) return [];
  return MIME_TYPES.filter((m) => m.mime === t || (m.aliases ?? []).some((a) => a.toLowerCase() === t));
}

export type MimeSearchResult = { mode: 'extension' | 'mime' | 'text'; results: MimeEntry[] };

/** One search box: "png", ".png", "a/b.png" find by extension; "image/png" by type; words search names. */
export function searchMime(query: string, category?: MimeCategory | 'all'): MimeSearchResult {
  const q = query.trim().toLowerCase();
  const inCat = (m: MimeEntry) => !category || category === 'all' || m.category === category;
  if (!q) return { mode: 'text', results: MIME_TYPES.filter(inCat) };
  if (/^[a-z0-9.+-]+\/[a-z0-9.+*-]+/.test(q) && !/\.[a-z0-9]+$/.test(q.split(';')[0].split('/')[1] ?? '') ) {
    const exact = lookupMime(q);
    if (exact.length) return { mode: 'mime', results: exact.filter(inCat) };
    const base = q.split(';')[0];
    if (base.endsWith('/*')) {
      const top = base.slice(0, -2);
      return { mode: 'mime', results: MIME_TYPES.filter((m) => m.mime.startsWith(top + '/') && inCat(m)) };
    }
    return { mode: 'mime', results: MIME_TYPES.filter((m) => (m.mime.includes(base) || (m.aliases ?? []).some((a) => a.includes(base))) && inCat(m)) };
  }
  const looksLikeFile = /^\.?[a-z0-9]{1,12}$/.test(q) || /[\\/]|\.[a-z0-9]{1,12}$/.test(q);
  if (looksLikeFile) {
    const hit = lookupExtension(q);
    if (hit) {
      const same = MIME_TYPES.filter((m) => m !== hit && m.mime === hit.mime);
      return { mode: 'extension', results: [hit, ...same].filter(inCat) };
    }
  }
  const words = q.split(/\s+/);
  return {
    mode: 'text',
    results: MIME_TYPES.filter((m) => inCat(m) && words.every((w) => `${m.name} ${m.mime} ${m.ext.join(' ')} ${m.category}`.toLowerCase().includes(w.replace(/^\./, '')))),
  };
}

/** Content-Type header value to send, adding charset=utf-8 for text types where it matters. */
export function contentTypeHeader(m: MimeEntry): string {
  const textual = m.mime.startsWith('text/') || ['application/xml', 'application/xhtml+xml', 'image/svg+xml', 'application/yaml'].includes(m.mime);
  return textual ? `${m.mime}; charset=utf-8` : m.mime;
}

/** Map extension -> type in the formats servers use. */
export function serverConfigSnippet(m: MimeEntry, server: 'nginx' | 'apache' | 'iis'): string {
  const exts = m.ext.length ? m.ext : ['ext'];
  if (server === 'nginx') return `types {\n    ${m.mime} ${exts.join(' ')};\n}`;
  if (server === 'apache') return `AddType ${m.mime} ${exts.map((e) => '.' + e).join(' ')}`;
  return `<staticContent>\n${exts.map((e) => `  <remove fileExtension=".${e}" />\n  <mimeMap fileExtension=".${e}" mimeType="${m.mime}" />`).join('\n')}\n</staticContent>`;
}
