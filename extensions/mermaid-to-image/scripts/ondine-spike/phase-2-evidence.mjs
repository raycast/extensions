import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
export { compareRgba, decodeImage } from "./phase-2-pixels.mjs";

export async function createRunDirectory(requested) {
  if (!requested) return fs.mkdtemp(path.join(os.tmpdir(), "ondine-phase2-"));
  const directory = path.resolve(requested);
  await fs.mkdir(directory, { recursive: false });
  return directory;
}

export async function recordStage(stages, name, action) {
  try {
    stages[name] = { status: "ok", ...(await action()) };
    return true;
  } catch (error) {
    stages[name] = { status: "error", error: describeError(error) };
    return false;
  }
}

export function describeError(error) {
  return { name: error?.name ?? "Error", code: error?.code, message: String(error?.message ?? error).slice(0, 2000) };
}

export function summarizeRows(rows, expectedCases) {
  const requiredGenerated = ["svg", "original", "materialized", "production"];
  const requiredMeasured = ["materialization", "production"];
  const failedCases = rows.filter(
    (row) =>
      !row.completed ||
      row.workerError ||
      requiredGenerated.some((key) => row.generated?.[key]?.status !== "ok") ||
      requiredMeasured.some((key) => row.measured?.[key]?.status !== "ok") ||
      (row.nativeRequested && (row.generated?.native?.status !== "ok" || row.measured?.native?.status !== "ok")) ||
      row.generated?.native?.status === "error" ||
      row.measured?.native?.status === "error",
  ).length;
  return {
    expectedCases,
    recordedCases: rows.length,
    failedCases,
    automationComplete: rows.length === expectedCases && failedCases === 0,
    visualPending: rows.filter((row) => row.visualReview?.status === "pending").length,
  };
}

export function runIsolatedWorker(args, { timeoutMs = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--max-old-space-size=512", ...args], {
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk).slice(-16000);
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-16000);
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === "win32") child.kill("SIGKILL");
        else
          killWorkerTree(child.pid, (message) => {
            stderr += message;
          });
      } catch (error) {
        if (error.code !== "ESRCH") stderr += String(error);
      }
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, timedOut, stdout, stderr });
    });
  });
}

function killWorkerTree(pid, reportError) {
  const signal = (target, name) => {
    try {
      process.kill(target, name);
    } catch (error) {
      if (error.code !== "ESRCH") reportError(String(error));
    }
  };
  signal(pid, "SIGSTOP");
  try {
    const table = execFileSync("ps", ["-axo", "pid=,ppid=,pgid="], {
      encoding: "utf8",
      timeout: 2000,
      maxBuffer: 4 * 1024 * 1024,
    })
      .trim()
      .split("\n")
      .map((line) => line.trim().split(/\s+/).map(Number));
    const descendants = new Set([pid]);
    let added = true;
    while (added) {
      added = false;
      for (const [child, parent] of table) {
        if (descendants.has(parent) && !descendants.has(child)) {
          descendants.add(child);
          added = true;
        }
      }
    }
    for (const [child, , group] of table.reverse()) {
      if (!descendants.has(child) || child === pid) continue;
      if (child === group) signal(-group, "SIGKILL");
      signal(child, "SIGKILL");
    }
  } catch (error) {
    reportError(`Process-tree snapshot failed: ${error.message}`);
  } finally {
    signal(-pid, "SIGKILL");
    signal(pid, "SIGKILL");
  }
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildGallery(rows, summary) {
  const panels = [
    ["original", "A: original themed SVG / browser"],
    ["materialized", "B: materialized SVG / browser"],
    ["production", "C: production browser preview / copy helper"],
    ["native", "D: native candidate (if requested)"],
  ];
  return `<!doctype html><meta charset="utf-8"><title>Ondine Phase 2 — visual review pending</title>
<style>body{font:15px system-ui;margin:24px}section{border-top:1px solid #999;padding:16px 0}figure{display:inline-block;vertical-align:top;width:46%;margin:1%}img{max-width:100%;background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0/16px 16px}pre{white-space:pre-wrap}a{overflow-wrap:anywhere}</style>
<h1>Phase 2 evidence — NOT visual approval</h1><p>Click images for actual resolution. CSS-sized panels are for review, not pixel alignment. Diff is absolute RGBA difference amplified 32×, opaque black means equal.</p><pre>${escapeHtml(JSON.stringify(summary, null, 2))}</pre>
${rows
  .map(
    (
      row,
    ) => `<section><h2>${escapeHtml(row.name)}</h2><p>Visual review: ${escapeHtml(row.visualReview?.status ?? "pending")}</p><a href="${escapeHtml(row.sourceFile)}">Mermaid source</a> · <a href="${escapeHtml(row.name)}/result.json">Case JSON</a>
${panels
  .map(([key, label]) => {
    const stage = row.generated?.[key];
    return `<figure><figcaption>${escapeHtml(label)}</figcaption>${stage?.status === "ok" ? `<a href="${escapeHtml(stage.file)}"><img src="${escapeHtml(stage.file)}"></a><p>${escapeHtml(JSON.stringify(row.measured?.[key] ?? stage.dimensions ?? {}))}</p>` : `<pre>${escapeHtml(JSON.stringify(stage ?? { status: "not-run" }, null, 2))}</pre>`}</figure>`;
  })
  .join("")}
${row.measured?.materialization?.diffFile ? `<p><a href="${escapeHtml(row.measured.materialization.diffFile)}">A/B amplified diff</a></p><img style="max-width:90%" src="${escapeHtml(row.measured.materialization.diffFile)}">` : ""}<pre>${escapeHtml(JSON.stringify({ measured: row.measured, workerError: row.workerError }, null, 2))}</pre></section>`,
  )
  .join("\n")}`;
}
