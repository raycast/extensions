// Imported by exact file path (not the bare "@hyzyla/pdfium" specifier) to force esbuild to pick
// the Node/CommonJS build. The package's ESM build relies on `import.meta.url`, which does not
// exist once esbuild bundles everything into Raycast's single CommonJS output file.
import { PDFiumLibrary } from "@hyzyla/pdfium/dist/index.cjs";
import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { rmSync } from "fs";
import { PNG } from "pngjs";
import { join } from "path";

export const PDF_PREVIEW_DIR = join(environment.supportPath, ".pdf-previews");
const THUMBNAIL_SCALE = 2;

// PDFium is compiled to WebAssembly, so a single instance is loaded lazily and reused
// across renders instead of a native addon (Raycast's bundler rejects native .node modules).
// Being WebAssembly is also what makes this work identically on macOS and Windows.
// The .wasm binary is shipped in assets/ and loaded manually: the library's own on-disk lookup
// assumes an unbundled node_modules layout, which does not survive Raycast's single-file bundling.
let libraryPromise: Promise<PDFiumLibrary> | null = null;

async function getLibrary(): Promise<PDFiumLibrary> {
  if (!libraryPromise) {
    libraryPromise = (async () => {
      try {
        const wasmFile = await readFile(join(environment.assetsPath, "pdfium.wasm"));
        const wasmBinary = wasmFile.buffer.slice(
          wasmFile.byteOffset,
          wasmFile.byteOffset + wasmFile.byteLength,
        ) as ArrayBuffer;
        return await PDFiumLibrary.init({ wasmBinary });
      } catch (error) {
        // Let the next call retry instead of permanently caching a rejected promise.
        libraryPromise = null;
        throw error;
      }
    })();
  }
  return libraryPromise;
}

// Cache key includes mtime so an edited PDF gets a fresh preview automatically.
function thumbnailPathFor(sourcePath: string, mtimeMs: number): string {
  const hash = createHash("md5").update(`${sourcePath}:${mtimeMs}`).digest("hex");
  return join(PDF_PREVIEW_DIR, `${hash}.png`);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getPdfThumbnail(sourcePath: string, mtimeMs: number): Promise<string | null> {
  const thumbnailPath = thumbnailPathFor(sourcePath, mtimeMs);
  if (await fileExists(thumbnailPath)) {
    return thumbnailPath;
  }

  let document;
  try {
    await mkdir(PDF_PREVIEW_DIR, { recursive: true });

    const library = await getLibrary();
    const pdfBytes = await readFile(sourcePath);
    document = await library.loadDocument(pdfBytes);

    const page = document.getPage(0);
    const image = await page.render({ scale: THUMBNAIL_SCALE, render: "bitmap" });

    const png = new PNG({ width: image.width, height: image.height });
    png.data = Buffer.from(image.data);

    await writeFile(thumbnailPath, PNG.sync.write(png));
    return thumbnailPath;
  } catch (error) {
    console.error(`Failed to render PDF preview for "${sourcePath}":`, error);
    return null;
  } finally {
    document?.destroy();
  }
}

export function purgePdfThumbnails() {
  rmSync(PDF_PREVIEW_DIR, { recursive: true, force: true });
}
