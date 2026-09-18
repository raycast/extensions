import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { buildPage, captureSelector, MAX_WIDTH } from "./page";
import type { ChartSource } from "./source";

export interface RenderOptions {
  executable: string;
  vendorDir: string;
  /** Where the page and the PNG are written. */
  workDir: string;
  dark: boolean;
  /** Leaving the view closes the browser mid-render. */
  signal?: AbortSignal;
}

export interface RenderedImage {
  path: string;
  /** CSS pixels; the PNG itself is twice that. */
  width: number;
  height: number;
}

const SCALE = 2;
const TIMEOUT = 20000;
const KEEP_FOR = 60 * 60 * 1000;

/**
 * Each render is its own file, so views lower in the navigation stack keep
 * theirs for Copy Image and Save. Renders older than an hour are swept.
 */
export function newImagePath(workDir: string): string {
  mkdirSync(workDir, { recursive: true });
  const cutoff = Date.now() - KEEP_FOR;
  for (const entry of readdirSync(workDir)) {
    if (!entry.startsWith("render-") || !entry.endsWith(".png")) continue;
    const path = join(workDir, entry);
    if (statSync(path).mtimeMs < cutoff) rmSync(path, { force: true });
  }
  return join(workDir, `render-${Date.now()}.png`);
}

function abortError(): Error {
  const error = new Error("Render abandoned");
  error.name = "AbortError";
  return error;
}

/** Draws the source in a headless Chromium and captures the chart element at 2x. */
export async function renderInBrowser(source: ChartSource, options: RenderOptions): Promise<RenderedImage> {
  if (options.signal?.aborted) throw abortError();
  const pagePath = join(options.workDir, "render.html");
  const imagePath = newImagePath(options.workDir);
  writeFileSync(pagePath, buildPage(source, options.dark, options.vendorDir));

  const browser = await puppeteer.launch({
    executablePath: options.executable,
    headless: true,
    timeout: TIMEOUT,
    args: ["--no-first-run", "--no-default-browser-check", "--hide-scrollbars"],
  });
  const close = () => browser.close().catch(() => undefined);
  options.signal?.addEventListener("abort", close, { once: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: MAX_WIDTH + 32, height: 900, deviceScaleFactor: SCALE });
    await page.goto(pathToFileURL(pagePath).href, { waitUntil: "load", timeout: TIMEOUT });
    // The page reports through window.status; the functions run in the browser, where tsc cannot see it.
    await page.waitForFunction("window.status !== 'pending'", { timeout: TIMEOUT });
    const status = await page.evaluate<[], () => string>("window.status");
    if (status !== "done") throw new Error(String(status).replace(/^error: /, ""));
    // Let fonts and the canvas settle before capture.
    await new Promise((done) => setTimeout(done, 150));
    const element = await page.$(captureSelector(source));
    if (!element) throw new Error("The page drew nothing to capture.");
    const box = await element.boundingBox();
    if (!box || box.width === 0 || box.height === 0) throw new Error("The chart has no size.");
    await element.screenshot({ path: imagePath, omitBackground: true });
    return { path: imagePath, width: Math.round(box.width), height: Math.round(box.height) };
  } catch (error) {
    if (options.signal?.aborted) throw abortError();
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", close);
    await close();
  }
}
