/** Save self-contained HTML or render the same print layout to PDF with a local Chromium browser. */
import { constants } from "node:fs";
import {
  access,
  mkdtemp,
  mkdir,
  open as openFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const run = promisify(execFile);

export type SavedReport = {
  format: "html" | "pdf" | "print-ready-html";
  path: string;
  reason?: string;
};

export function safeReportBasename(project: string, date = new Date()): string {
  const normalized =
    project
      .replace(/Ł/g, "L")
      .replace(/ł/g, "l")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "accessibility-review";
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .replace("T", "-");
  return `WCAG-${normalized}-${stamp}`;
}

async function availableExecutable(
  paths: string[],
): Promise<string | undefined> {
  for (const path of paths) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      /* keep looking */
    }
  }
  return undefined;
}

/** Browser binaries are optional. Safari users can print the HTML to PDF manually. */
export async function findPdfBrowser(): Promise<string | undefined> {
  const roots = ["/Applications", join(homedir(), "Applications")];
  const bundles: [string, string][] = [
    ["Google Chrome", "Google Chrome"],
    ["Google Chrome Beta", "Google Chrome Beta"],
    ["Microsoft Edge", "Microsoft Edge"],
    ["Brave Browser", "Brave Browser"],
    ["Chromium", "Chromium"],
  ];
  const paths = roots.flatMap((root) =>
    bundles.map(([app, bin]) =>
      join(root, `${app}.app`, "Contents", "MacOS", bin),
    ),
  );
  // Development/test runner on Linux; users on macOS normally use an app bundle.
  if (process.platform !== "darwin")
    paths.push("/usr/bin/chromium", "/usr/bin/google-chrome");
  return availableExecutable(paths);
}

async function uniqueFilePath(
  directory: string,
  base: string,
  extension: string,
): Promise<string> {
  for (let suffix = 0; suffix < 1000; suffix++) {
    const file = join(
      directory,
      `${base}${suffix ? `-${suffix}` : ""}.${extension}`,
    );
    try {
      const handle = await openFile(file, "wx");
      await handle.close();
      return file;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Could not create a unique report filename");
}

async function validPdf(path: string): Promise<boolean> {
  const info = await stat(path);
  if (info.size < 1000) return false;
  const handle = await openFile(path, "r");
  try {
    const buffer = Buffer.alloc(5);
    await handle.read(buffer, 0, 5, 0);
    return buffer.toString("ascii") === "%PDF-";
  } finally {
    await handle.close();
  }
}

async function printWithBrowser(
  htmlPath: string,
  pdfPath: string,
  browser: string,
  workingDirectory: string,
): Promise<void> {
  const browserProfile = join(workingDirectory, "chromium-profile");
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--export-tagged-pdf", // Chromium: derive a PDF structure tree from the HTML accessibility tree.
    "--no-pdf-header-footer",
    `--user-data-dir=${browserProfile}`,
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ];
  await run(browser, args, { timeout: 60000, maxBuffer: 1024 * 1024 });
  if (!(await validPdf(pdfPath)))
    throw new Error("Browser did not produce a valid PDF");
  // PDF/UA still requires separate human and automated inspection. Reject obviously
  // untagged documents rather than offering a visually attractive, inaccessible PDF.
  const bytes = await readFile(pdfPath);
  if (
    !bytes.includes(Buffer.from("/StructTreeRoot")) ||
    !bytes.includes(Buffer.from("/MarkInfo"))
  ) {
    throw new Error(
      "The browser produced a PDF without verifiable structure tags",
    );
  }
}

export async function saveAuditReport(
  html: string,
  project: string,
  format: "html" | "pdf",
  options: { browser?: string; outputDirectory?: string } = {},
): Promise<SavedReport> {
  const downloads = options.outputDirectory ?? join(homedir(), "Downloads");
  await mkdir(downloads, { recursive: true });
  const base = safeReportBasename(project);
  if (format === "html") {
    const location = await uniqueFilePath(downloads, base, "html");
    await writeFile(location, html, "utf8");
    return { format: "html", path: location };
  }

  const browser = options.browser ?? (await findPdfBrowser());
  if (browser) {
    const temp = await mkdtemp(join(tmpdir(), "wcag-report-"));
    const htmlPath = join(temp, "printable.html");
    const pdfPath = await uniqueFilePath(downloads, base, "pdf");
    try {
      await writeFile(htmlPath, html, "utf8");
      await printWithBrowser(htmlPath, pdfPath, browser, temp);
      return { format: "pdf", path: pdfPath };
    } catch (error) {
      await rm(pdfPath, { force: true }).catch(() => undefined);
      const message =
        error instanceof Error ? error.message : "Could not create PDF";
      const fallback = await uniqueFilePath(downloads, base, "html");
      await writeFile(fallback, html, "utf8");
      return { format: "print-ready-html", path: fallback, reason: message };
    } finally {
      await rm(temp, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  const fallback = await uniqueFilePath(downloads, base, "html");
  await writeFile(fallback, html, "utf8");
  return {
    format: "print-ready-html",
    path: fallback,
    reason: "No local Chrome, Edge, Brave or Chromium executable found",
  };
}
