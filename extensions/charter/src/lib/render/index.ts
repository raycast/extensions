import { environment, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import { findBrowser } from "./browser";
import { DEFAULT_KROKI_URL, renderWithKroki } from "./kroki";
import type { RenderedImage } from "./render";
import type { ChartSource } from "./source";

type RenderOutcome = { status: "ok"; image: RenderedImage } | { status: "no-browser" };

const vendorDir = join(environment.assetsPath, "vendor");
const workDir = join(environment.supportPath, "renders");

function isDark(): boolean {
  return environment.appearance === "dark";
}

/** Draws with the preferred or first installed browser; reports when there is none rather than throwing. */
export async function renderChart(source: ChartSource, signal?: AbortSignal): Promise<RenderOutcome> {
  const { browser } = getPreferenceValues<Preferences>();
  const executable = findBrowser(browser?.path);
  if (!executable) return { status: "no-browser" };
  // Loaded on first use: puppeteer-core is the heaviest module in the bundle and the catalog rarely needs it.
  const { renderInBrowser } = await import("./render");
  const image = await renderInBrowser(source, { executable, vendorDir, workDir, dark: isDark(), signal });
  return { status: "ok", image };
}

/** The network route, taken only when the user asks for it. */
export async function renderChartWithKroki(source: ChartSource, signal?: AbortSignal): Promise<RenderOutcome> {
  const { krokiUrl } = getPreferenceValues<Preferences>();
  const image = await renderWithKroki(source, krokiUrl || DEFAULT_KROKI_URL, isDark(), workDir, signal);
  return { status: "ok", image };
}
