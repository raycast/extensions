import { getPreferenceValues, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const pexec = promisify(exec);

interface Preferences {
  externalDisplayId: string;
  macbookDisplayId: string;
  macbookOriginSideBySide: string;
  macbookOriginUpAndDown: string;
  displayplacerPath: string;
}

type Layout = "side-by-side" | "up-and-down";

function quoteForShell(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildLayoutArgs(layout: Layout, prefs: Preferences): string[] {
  const { externalDisplayId: ext, macbookDisplayId: mb } = prefs;
  if (layout === "side-by-side") {
    return [
      `id:${mb}  res:1512x982  hz:120 color_depth:8 enabled:true scaling:on  origin:${prefs.macbookOriginSideBySide} degree:0`,
      `id:${ext} res:3440x1440 hz:144 color_depth:8 enabled:true scaling:off origin:(0,0) degree:180`,
    ];
  }
  return [
    `id:${ext} res:3440x1440 hz:144 color_depth:8 enabled:true scaling:off origin:(0,0) degree:180`,
    `id:${mb}  res:1512x982  hz:120 color_depth:8 enabled:true scaling:on  origin:${prefs.macbookOriginUpAndDown} degree:0`,
  ];
}

async function currentMacbookOrigin(prefs: Preferences): Promise<string | null> {
  const { stdout } = await pexec(`${quoteForShell(prefs.displayplacerPath)} list`);
  const block = stdout.split(/\n\s*\n/).find((b) => b.includes(`Persistent screen id: ${prefs.macbookDisplayId}`));
  if (!block) return null;
  const match = block.match(/^Origin:\s*(\S+)/m);
  return match ? match[1] : null;
}

function pickNextLayout(currentOrigin: string | null, prefs: Preferences): Layout {
  if (currentOrigin === prefs.macbookOriginUpAndDown) return "side-by-side";
  if (currentOrigin === prefs.macbookOriginSideBySide) return "up-and-down";
  return "side-by-side";
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling arrangement…" });

  try {
    const currentOrigin = await currentMacbookOrigin(prefs);
    const next = pickNextLayout(currentOrigin, prefs);
    const args = buildLayoutArgs(next, prefs).map(quoteForShell).join(" ");
    await pexec(`${quoteForShell(prefs.displayplacerPath)} ${args}`);

    toast.style = Toast.Style.Success;
    toast.title = next === "side-by-side" ? "Side-by-side" : "Up-and-down";
    toast.message = next === "side-by-side" ? "MacBook left, external right" : "External top, MacBook below";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to toggle arrangement";
    toast.message = /ENOENT|not found|No such file/i.test(message)
      ? "displayplacer not found. Install with `brew install displayplacer`."
      : message;
    toast.primaryAction = {
      title: "Open Preferences",
      onAction: () => openExtensionPreferences(),
    };
  }
}
