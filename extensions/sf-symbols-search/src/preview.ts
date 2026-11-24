import { readFileSync } from "node:fs";
import { access, mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import { runCLI, SFSymbolsApp } from "./sfsymbols-cli";
import { textColor, TileMode } from "./tiles";

/** Large renderings for the symbol info view and list sidebar, one per rendering mode, cached per appearance. */
const PREVIEWS_ROOT = path.join(environment.supportPath, "previews");

/** 128pt at 2x is 256px, enough for the sidebar's card, which draws the symbol at 128pt on a Retina display. */
const PREVIEW_POINT_SIZE = "128";
const PREVIEW_IMAGE_SCALE = "2";
/** Names this size's folders, so a size change never reuses smaller renderings. */
const SIZE_SUFFIX = `@${PREVIEW_POINT_SIZE}`;
/** Monochrome category icons, drawn black so the dropdown can tint them. */
const ICONS_FOLDER = "icons";

function previewDir(catalogKey: string, weight: string): string {
  return path.join(PREVIEWS_ROOT, catalogKey, `${weight}-${environment.appearance}${SIZE_SUFFIX}`);
}

/** Where a preview lives once rendered, for the current appearance. */
export function previewPath(catalogKey: string, name: string, mode: TileMode, weight: string): string {
  // Multicolor is tinted with the system accent, as SF Symbols draws it: its fixed white layers
  // would vanish into a white tint in dark mode.
  const file = mode === "multicolor" ? `${name}.multicolor-accent.png` : `${name}.${mode}.png`;
  return path.join(previewDir(catalogKey, weight), file);
}

/**
 * Renders `name` in each requested mode (or reuses an earlier rendering) and returns the files.
 * They are drawn in the theme's text color, because hierarchical and multicolor can't be tinted.
 */
export async function renderPreviews(
  app: SFSymbolsApp,
  catalogKey: string,
  name: string,
  modes: readonly TileMode[],
  weight: string,
): Promise<Partial<Record<TileMode, string>>> {
  await mkdir(previewDir(catalogKey, weight), { recursive: true });
  const color = textColor(environment.appearance);
  // Each CLI run costs about a second and a half of startup, so the modes render side by side.
  const files = await Promise.all(
    modes.map(async (mode) => {
      const file = previewPath(catalogKey, name, mode, weight);
      try {
        await access(file);
      } catch {
        // Render beside the cache and move it in whole, so a half-written file is never shown.
        const staging = await mkdtemp(path.join(PREVIEWS_ROOT, ".staging-"));
        try {
          const out = path.join(staging, `${name}.png`);
          await runCLI(app, [
            "export",
            name,
            "--format",
            "png",
            "--output",
            out,
            "--rendering-mode",
            mode,
            "--weight",
            weight,
            "--color",
            mode === "multicolor" ? "accent" : color,
            "--point-size",
            PREVIEW_POINT_SIZE,
            "--image-scale",
            PREVIEW_IMAGE_SCALE,
            "--quiet",
          ]);
          await rename(out, file);
        } finally {
          await rm(staging, { recursive: true, force: true });
        }
      }
      return [mode, file] as const;
    }),
  );
  return Object.fromEntries(files);
}

/**
 * Black monochrome renderings of the category menu's icons, so each can be tinted to its
 * category's color whatever rendering mode the grid is in. Returns name → file for those on disk.
 */
export async function renderCategoryIcons(
  app: SFSymbolsApp,
  catalogKey: string,
  names: readonly string[],
): Promise<Record<string, string>> {
  const dir = path.join(PREVIEWS_ROOT, catalogKey, ICONS_FOLDER);
  await mkdir(dir, { recursive: true });
  const fileFor = (name: string) => path.join(dir, `${name}.png`);
  const present = async (name: string) =>
    access(fileFor(name)).then(
      () => true,
      () => false,
    );
  const missing = (await Promise.all(names.map(async (name) => ((await present(name)) ? null : name)))).filter(
    (name): name is string => name !== null,
  );
  if (missing.length > 0) {
    const staging = await mkdtemp(path.join(PREVIEWS_ROOT, ".staging-"));
    try {
      await runCLI(app, [
        "export",
        ...missing,
        "--format",
        "png",
        "--output-dir",
        staging,
        "--continue-on-error",
        "--rendering-mode",
        "monochrome",
        "--color",
        "black",
        "--point-size",
        "32",
        "--image-scale",
        "2",
        "--quiet",
      ]).catch(() => "");
      for (const name of missing) {
        await rename(path.join(staging, `${name}.png`), fileFor(name)).catch(() => {});
      }
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
  const found = await Promise.all(names.map(async (name) => [name, (await present(name)) ? fileFor(name) : ""]));
  return Object.fromEntries(found.filter(([, file]) => file));
}

/** Show Info's card size; three fit beside each other. */
const CELL = 132;
const INSET = 22;
const GAP = 14;
const LABEL_HEIGHT = 28;

/**
 * Raycast's markdown stacks images vertically, so the previews are drawn into one SVG strip, each on
 * its own card with its mode named underneath, and shown as a single image. SVG inside a sandboxed
 * image can't read the theme, so the colors are chosen here from the current appearance.
 */
export function previewStripMarkdown(
  previews: readonly { label: string; file: string }[],
  cell: number = CELL,
): string {
  const dark = environment.appearance === "dark";
  const card = dark ? "#ffffff" : "#000000";
  const text = dark ? "#9a9a9a" : "#6e6e6e";
  const width = previews.length * cell + (previews.length - 1) * GAP;
  const height = cell + LABEL_HEIGHT;
  // Read synchronously: a preview is a few dozen KB, and a card built during render has no
  // placeholder moment.
  const cells = previews.map(({ label, file }, index) => {
    const x = index * (cell + GAP);
    const href = `data:image/png;base64,${readFileSync(file).toString("base64")}`;
    const size = cell - INSET * 2;
    return [
      `<rect x="${x}" y="0" width="${cell}" height="${cell}" rx="14" fill="${card}" fill-opacity="0.06"/>`,
      `<image x="${x + INSET}" y="${INSET}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" href="${href}" xlink:href="${href}"/>`,
      `<text x="${x + cell / 2}" y="${cell + 20}" text-anchor="middle" font-family="-apple-system, Helvetica, sans-serif" font-size="13" fill="${text}">${label}</text>`,
    ].join("");
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${cells.join("")}</svg>`;
  const labels = previews.map(({ label }) => label).join(", ");
  return `![${labels}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=${width})`;
}

/** Drops cached previews from older catalog versions, and renderings at a size no longer used. */
export async function prunePreviews(catalogKey: string): Promise<void> {
  try {
    for (const entry of await readdir(PREVIEWS_ROOT)) {
      // Staging folders belong to a preview another window may still be rendering.
      if (entry !== catalogKey && !entry.startsWith(".staging-"))
        await rm(path.join(PREVIEWS_ROOT, entry), { recursive: true, force: true });
    }
    for (const entry of await readdir(path.join(PREVIEWS_ROOT, catalogKey))) {
      if (entry !== ICONS_FOLDER && !entry.endsWith(SIZE_SUFFIX))
        await rm(path.join(PREVIEWS_ROOT, catalogKey, entry), { recursive: true, force: true });
    }
  } catch {
    // Nothing cached yet.
  }
}
