import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const TEX_BIN = "/Library/TeX/texbin";
const LATEX_PATH = path.join(TEX_BIN, "latex");
const DVIPNG_PATH = path.join(TEX_BIN, "dvipng");
const PROCESS_TIMEOUT_MS = 8_000;
const MAX_PROCESS_OUTPUT = 1024 * 1024;
// Leave room around the image in Raycast's List.EmptyView.
const PREVIEW_BOUNDS = { width: 640, height: 300 };

const LATEX_COLORS = {
  black: "rgb 0 0 0",
  white: "rgb 1 1 1",
};
type ForegroundColor = keyof typeof LATEX_COLORS;

export class FormulaRenderError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = "FormulaRenderError";
  }
}

export async function renderPreview(formula: string, options: Preferences, signal?: AbortSignal) {
  const [light, dark] = await renderImages(formula, options, ["black", "white"], PREVIEW_BOUNDS, signal);
  return { source: { light: toPngDataUrl(light), dark: toPngDataUrl(dark) } };
}

export async function renderPng(formula: string, options: Preferences) {
  const [image] = await renderImages(formula, options, ["black"]);
  return image;
}

async function renderImages(
  formula: string,
  { renderer, preamble }: Preferences,
  colors: ForegroundColor[],
  bounds?: { width: number; height: number },
  signal?: AbortSignal
) {
  const workDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "quick-math-"));

  try {
    const outputPath = path.join(workDirectory, "formula.png");
    let dviPath: string | undefined;
    if (renderer !== "typst") {
      await checkLatexDependencies();
      dviPath = await compileToDvi(formula.trim() ? formula : "LaTeX", preamble, workDirectory, signal);
    }

    const images: Buffer[] = [];
    for (const color of colors) {
      if (dviPath) {
        await convertDviToPng(dviPath, outputPath, workDirectory, color, signal);
      } else {
        await compileTypst(formula, outputPath, workDirectory, color, signal);
      }

      const image = await fs.readFile(outputPath, { signal });
      images.push(bounds ? await fitPreview(image, outputPath, bounds, signal) : image);
    }
    return images;
  } finally {
    await fs.rm(workDirectory, { recursive: true, force: true });
  }
}

async function checkLatexDependencies() {
  await requireExecutable(
    LATEX_PATH,
    `LaTeX was not found at ${LATEX_PATH}. Install BasicTeX or MacTeX and try again.`
  );
  await requireExecutable(
    DVIPNG_PATH,
    `dvipng was not found at ${DVIPNG_PATH}. Install it with: sudo ${path.join(TEX_BIN, "tlmgr")} install dvipng`
  );
}

async function requireExecutable(executablePath: string, message: string) {
  try {
    await fs.access(executablePath, fsConstants.X_OK);
  } catch {
    throw new FormulaRenderError(message);
  }
}

async function compileToDvi(latex: string, preamble: string, workDirectory: string, signal?: AbortSignal) {
  const texPath = path.join(workDirectory, "formula.tex");
  await fs.writeFile(texPath, buildDocument(latex, preamble), "utf8");

  await runCommand(
    LATEX_PATH,
    [
      "-no-shell-escape",
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-file-line-error",
      `-output-directory=${workDirectory}`,
      texPath,
    ],
    workDirectory,
    signal,
    "LaTeX could not render this formula or custom preamble."
  );

  return path.join(workDirectory, "formula.dvi");
}

async function convertDviToPng(
  dviPath: string,
  outputPath: string,
  workDirectory: string,
  foreground: ForegroundColor,
  signal?: AbortSignal
) {
  await runCommand(
    DVIPNG_PATH,
    ["-D", "512", "-T", "tight", "-bg", "Transparent", "-fg", LATEX_COLORS[foreground], "-o", outputPath, dviPath],
    workDirectory,
    signal,
    "dvipng could not create the PNG image."
  );
}

async function compileTypst(
  formula: string,
  outputPath: string,
  workDirectory: string,
  foreground: ForegroundColor,
  signal?: AbortSignal
) {
  const source = `#set page(width: auto, height: auto, margin: 1pt, fill: none)
#set text(size: 12pt, fill: ${foreground})
$ ${formula.trim() || "x"} $
`;
  await fs.writeFile(path.join(workDirectory, "formula.typ"), source, "utf8");
  await runCommand(
    "typst",
    ["compile", "--ppi", "512", "--diagnostic-format", "short", "formula.typ", outputPath],
    workDirectory,
    signal,
    "Typst could not render this formula."
  );
}

async function fitPreview(
  image: Buffer,
  outputPath: string,
  bounds: { width: number; height: number },
  signal?: AbortSignal
) {
  // The first PNG chunk (IHDR) stores the pixel width and height.
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  const scale = Math.min(bounds.width / width, bounds.height / height);
  if (scale >= 1) return image;

  const longestSide = Math.floor(Math.max(width, height) * scale);
  await runCommand(
    "/usr/bin/sips",
    ["-Z", String(longestSide), outputPath],
    path.dirname(outputPath),
    signal,
    "Could not resize the formula preview."
  );
  return fs.readFile(outputPath, { signal });
}

function runCommand(
  executable: string,
  args: string[],
  cwd: string,
  signal: AbortSignal | undefined,
  fallbackMessage: string
) {
  return new Promise<void>((resolve, reject) => {
    execFile(
      executable,
      args,
      {
        cwd,
        signal,
        timeout: PROCESS_TIMEOUT_MS,
        maxBuffer: MAX_PROCESS_OUTPUT,
      },
      (error, stdout, stderr) => {
        if (!error) {
          return resolve();
        }

        if (error.name === "AbortError") {
          return reject(error);
        }

        const isTypst = executable === "typst";
        if (isTypst && error.code === "ENOENT") {
          return reject(new FormulaRenderError("Typst was not found. Make sure typst is on Raycast's PATH."));
        }

        const output = [stdout, stderr].filter(Boolean).join("\n");
        const detail = isTypst ? output.trim() : extractLatexError(output);
        const message =
          "killed" in error && error.killed
            ? `Rendering timed out after ${PROCESS_TIMEOUT_MS / 1000} seconds.`
            : fallbackMessage;
        reject(new FormulaRenderError(message, detail));
      }
    );
  });
}

function buildDocument(latex: string, preamble: string) {
  const customPreamble = preamble.replace(/\r\n?/g, "\n").trim();

  return `\\documentclass[12pt]{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
${customPreamble ? `${customPreamble}\n` : ""}\\pagestyle{empty}
\\begin{document}
\\thispagestyle{empty}
\\[
${latex}
\\]
\\end{document}
`;
}

function extractLatexError(output: string) {
  const lines = output.split(/\r?\n/);
  const errorIndex = lines.findIndex((line) => line.startsWith("!") || /formula\.tex:\d+:/.test(line));

  if (errorIndex === -1) {
    return undefined;
  }

  return lines
    .slice(errorIndex, errorIndex + 3)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function toPngDataUrl(image: Buffer) {
  return `data:image/png;base64,${image.toString("base64")}`;
}
