import { createHash } from "node:crypto";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { environment } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { VaultItem } from "./items";

function extractColor(css: string, mode: "dark" | "light", varNames: string[], fallback: string): string {
  const modeRegex = new RegExp(`\\.theme-${mode}[^{]*\\{([^}]*)\\}`, "gi");
  const blocks: string[] = [];
  let match;
  while ((match = modeRegex.exec(css)) !== null) {
    blocks.push(match[1]);
  }

  for (const varName of varNames) {
    for (const block of blocks) {
      const varRegex = new RegExp(`--${varName}:\\s*([^;\\}]+)[;\\}]`, "i");
      const varMatch = varRegex.exec(block);
      if (varMatch) return varMatch[1].trim();
    }
    const globalRegex = new RegExp(`--${varName}:\\s*([^;\\}]+)[;\\}]`, "i");
    const globalMatch = globalRegex.exec(css);
    if (globalMatch) return globalMatch[1].trim();
  }
  return fallback;
}

export async function generateThemePreviewSvg(item: VaultItem): Promise<string | undefined> {
  if (item.category !== "themes") return undefined;

  let themeCss = "";
  try {
    const cssPath =
      item.state === "available" || item.state === "native-unique"
        ? join(item.defaultPath, "theme.css")
        : join(item.targetPath, "theme.css");
    themeCss = await readFile(cssPath, "utf-8");
  } catch {
    try {
      themeCss = await readFile(join(item.defaultPath, "theme.css"), "utf-8");
    } catch {
      return undefined;
    }
  }

  let accentColorSetting: string | undefined;
  let isTranslucentSetting = false;

  const readAppearance = async (basePath: string) => {
    try {
      const appearancePath = join(basePath, "..", "..", "appearance.json");
      const appearanceData = JSON.parse(await readFile(appearancePath, "utf-8"));
      if (appearanceData.accentColor && !accentColorSetting) accentColorSetting = appearanceData.accentColor;
      if (appearanceData.translucency === true) isTranslucentSetting = true;
    } catch {
      // ignore
    }
  };

  if (item.state !== "available" && item.state !== "native-unique" && item.targetPath) {
    await readAppearance(item.targetPath);
  }
  if (!accentColorSetting || !isTranslucentSetting) {
    await readAppearance(item.defaultPath);
  }

  const bgPrimary = extractColor(themeCss, "dark", ["background-primary", "bg1", "color-base-00"], "#1e1e1e");
  const bgSecondary = extractColor(themeCss, "dark", ["background-secondary", "bg2", "color-base-20"], "#252526");
  const bgModifierBorder = extractColor(themeCss, "dark", ["background-modifier-border", "color-base-30"], "#333333");
  const textNormal = extractColor(themeCss, "dark", ["text-normal", "text", "color-text-normal"], "#cccccc");
  const textMuted = extractColor(themeCss, "dark", ["text-muted", "text-muted-color", "color-text-muted"], "#808080");
  const textFaint = extractColor(themeCss, "dark", ["text-faint", "text-faint-color", "color-text-faint"], "#4d4d4d");
  const interactiveAccent =
    accentColorSetting ||
    extractColor(themeCss, "dark", ["color-accent", "interactive-accent", "accent", "accent-color"], "#007acc");
  const textAccent =
    accentColorSetting || extractColor(themeCss, "dark", ["text-accent", "color-accent"], interactiveAccent);

  const opacityFillSecondary = isTranslucentSetting ? 'fill-opacity="0.8"' : "";
  const opacityFillPrimary = isTranslucentSetting ? 'fill-opacity="0.9"' : "";
  const opacityFillTabBar = isTranslucentSetting ? 'fill-opacity="0.85"' : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="400" viewBox="0 0 760 400">
    <defs>
      <linearGradient id="desktop" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2a1f4b" />
        <stop offset="50%" stop-color="#141a3a" />
        <stop offset="100%" stop-color="#0a2a2a" />
      </linearGradient>
    </defs>
    <rect width="760" height="400" rx="14" fill="url(#desktop)" />

    <rect width="760" height="400" rx="14" fill="${bgSecondary}" ${opacityFillSecondary} />
    <rect x="0" y="0" width="200" height="400" rx="14" fill="${bgSecondary}" ${opacityFillSecondary} />
    
    <circle cx="24" cy="24" r="6" fill="#ff5f56" />
    <circle cx="44" cy="24" r="6" fill="#ffbd2e" />
    <circle cx="64" cy="24" r="6" fill="#27c93f" />
    
    <text x="24" y="60" fill="${textFaint}" font-family="system-ui" font-size="11" font-weight="700" letter-spacing="1">FOLDERS</text>
    <rect x="16" y="74" width="168" height="28" rx="6" fill="${bgPrimary}" opacity="0.6"/>
    <text x="28" y="93" fill="${textAccent}" font-family="system-ui" font-size="13" font-weight="500">Welcome.md</text>
    <text x="28" y="123" fill="${textMuted}" font-family="system-ui" font-size="13">Ideas.md</text>
    <text x="28" y="153" fill="${textMuted}" font-family="system-ui" font-size="13">Tasks.md</text>
    
    <rect x="200" y="0" width="560" height="400" fill="${bgPrimary}" ${opacityFillPrimary} />
    <path d="M 200 0 L 200 400" stroke="${bgModifierBorder}" stroke-width="2" />
    
    <rect x="200" y="0" width="560" height="44" fill="${bgSecondary}" ${opacityFillTabBar} />
    <path d="M 200 44 L 760 44" stroke="${bgModifierBorder}" stroke-width="1" />
    <path d="M 320 14 L 320 30" stroke="${bgModifierBorder}" stroke-width="1" />
    
    <text x="240" y="27" fill="${textMuted}" font-family="system-ui" font-size="13">Welcome</text>
    
    <text x="240" y="100" fill="${textNormal}" font-family="system-ui" font-size="32" font-weight="700">Theme Preview</text>
    
    <text x="240" y="140" fill="${textNormal}" font-family="system-ui" font-size="16">This is a dynamic mockup of the <tspan fill="${textAccent}" font-weight="bold">${item.name}</tspan> theme.</text>
    <text x="240" y="170" fill="${textNormal}" font-family="system-ui" font-size="16">It extracts colors directly from <tspan font-family="monospace" fill="${textMuted}">theme.css</tspan>!</text>
    
    <rect x="240" y="210" width="130" height="34" rx="6" fill="${interactiveAccent}" />
    <text x="305" y="232" fill="#ffffff" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="600">Primary Button</text>
    
    <rect x="240" y="270" width="4" height="60" rx="2" fill="${interactiveAccent}" />
    <rect x="240" y="270" width="400" height="60" fill="${interactiveAccent}" opacity="0.1" />
    <text x="260" y="296" fill="${textMuted}" font-family="system-ui" font-size="15" font-style="italic">"The magic of Obsidian is in its extensibility."</text>
    <text x="260" y="318" fill="${textMuted}" font-family="system-ui" font-size="13">— A fellow knowledge worker</text>
  </svg>`;

  const hash = createHash("sha256").update(svg).digest("hex").slice(0, 8);
  const dir = join(environment.supportPath, "theme-previews-v2");
  await mkdir(dir, { recursive: true });

  try {
    const files = await readdir(dir);
    for (const f of files) {
      if (
        f.startsWith(item.name + "-" + item.state + "-") &&
        f !== item.name + "-" + item.state + "-" + hash + ".svg"
      ) {
        await unlink(join(dir, f)).catch(() => {});
      }
    }
  } catch {
    /* ignore */
  }

  const fileName = item.name + "-" + item.state + "-" + hash + ".svg";
  const filePath = join(dir, fileName);
  await writeFile(filePath, svg);
  return filePath;
}
