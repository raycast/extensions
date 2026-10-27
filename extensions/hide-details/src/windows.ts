import { environment } from "@raycast/api";
import { spawn } from "child_process";
import path from "path";
import { createInterface } from "readline";
import { classify, ocrBox, type Box, type OcrImage, type OcrLine } from "./detection";

type Analysis = {
  width: number;
  height: number;
  changeCount: number | null;
  text: OcrImage & { lines: OcrLine[] };
  faces: Box[];
};

const textCategories = ["email", "phone", "card", "secret", "ip", "name"];

// Escape non-ASCII so requests survive the PowerShell console code page.
function encode(value: unknown) {
  return JSON.stringify(value).replace(
    /[\u007f-\uffff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

// Runs one script operation. `respond` answers each intermediate response line until the script finishes.
async function run(request: Record<string, unknown>, respond?: (response: unknown) => unknown): Promise<unknown> {
  const script = path.join(environment.assetsPath, "windows", "hide-details.ps1");
  const child = spawn(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-STA", "-File", script],
    { windowsHide: true, timeout: 120_000 },
  );
  let stderr = "";
  child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
  const exited = new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  // Observed below; this keeps a spawn failure from surfacing as an unhandled rejection meanwhile.
  exited.catch(() => undefined);
  child.stdin.on("error", () => undefined);
  child.stdin.write(`${encode(request)}\n`);
  let last: unknown = null;
  try {
    for await (const line of createInterface({ input: child.stdout })) {
      if (!line.trim()) continue;
      try {
        last = JSON.parse(line);
      } catch {
        throw new Error("The Windows redaction helper returned an invalid response. Try again.");
      }
      if (respond && !(last as { done?: boolean }).done) child.stdin.write(`${encode(respond(last))}\n`);
    }
  } catch (error) {
    // Never leave the helper waiting on stdin with the unredacted image in memory.
    child.kill();
    throw error;
  }
  const code = await exited.catch((error: unknown) => {
    if ((error as { code?: unknown } | null)?.code === "ENOENT") {
      throw new Error("Windows PowerShell is unavailable. Hide Details needs powershell.exe to scan images.");
    }
    throw error;
  });
  if (code !== 0) throw new Error(stderr.trim() || "The Windows redaction helper stopped unexpectedly. Try again.");
  return last;
}

export async function redactImage(options: {
  outputPath: string;
  style: string;
  blurFaces?: boolean;
  padding: number;
  categories: Set<string>;
  extraWords: string;
  recognition: string;
  customRegex: string;
  inputPath: string | null;
}) {
  const extraWords = options.extraWords
    .split(",")
    .map((word) => word.replace(/\s/g, ""))
    .filter((word) => Array.from(word).length >= 2);
  let report: { hits: unknown[]; regionCount: number; clipboardChangeCount: number | null } | undefined;
  await run(
    {
      operation: "scan",
      inputPath: options.inputPath,
      style: options.style,
      recognition: options.recognition,
      customRegex: options.customRegex,
      text: !!options.customRegex || textCategories.some((category) => options.categories.has(category)),
      faces: options.categories.has("face"),
    },
    (response) => {
      const analysis = response as Analysis;
      const lines = analysis.text.lines.map((line) => ({ ...line, box: ocrBox(line.box, analysis.text, analysis) }));
      const { hits, regions } = classify(lines, analysis.faces, {
        categories: options.categories,
        extraWords,
        padding: options.padding,
        width: analysis.width,
        height: analysis.height,
      });
      report = { hits, regionCount: regions.length, clipboardChangeCount: analysis.changeCount };
      // Render faces first so overlapping text masks retain their selected style.
      const renderRegions = options.blurFaces
        ? [
            ...hits.filter((hit) => hit.kind === "face").map((hit) => ({ ...hit.box, style: "blur" })),
            ...hits.filter((hit) => hit.kind !== "face").map((hit) => ({ ...hit.box, style: options.style })),
          ]
        : regions;
      return { output: options.outputPath, regions: renderRegions };
    },
  );
  if (!report) throw new Error("The Windows redaction helper returned no result. Try scanning again.");
  return { ...report, output: options.outputPath };
}

export async function copyRedactedImage(outputPath: string, expectedChangeCount: number | null) {
  await run({ operation: "copy", outputPath, expectedChangeCount });
}

export async function clipboardChangeCount() {
  const response = (await run({ operation: "changeCount" })) as { changeCount: number };
  return response.changeCount;
}
