interface ThemeColors {
  bg: string;
  fg: string;
  line?: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
}

export function mapBeautifulThemeToOndine(theme: ThemeColors): Record<string, string> {
  const colors = {
    "--ondine-bg": theme.bg,
    "--ondine-fg": theme.fg,
    "--ondine-line": theme.line ?? theme.fg,
    "--ondine-accent": theme.accent ?? theme.fg,
    "--ondine-muted": theme.muted ?? theme.fg,
    "--ondine-surface": theme.surface ?? theme.bg,
    "--ondine-border": theme.border ?? theme.fg,
  };
  for (const value of Object.values(colors)) {
    if (!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)) throw new Error("Ondine theme requires hexadecimal colors.");
  }
  return colors;
}

export function applyOndineTheme(svg: string, variables: Record<string, string>): string {
  return svg.replace(/<svg\b[^>]*>/i, (root) => {
    const original = root.match(/\bstyle="([^"]*)"/)?.[1] ?? "";
    const retained = original
      .split(";")
      .filter(
        (declaration) =>
          !declaration.trim().startsWith("--ondine-") && !/^background(?:-color)?\s*:/i.test(declaration.trim()),
      )
      .join(";");
    const declarations = Object.entries(variables).map(([name, value]) => {
      if (!/^--ondine-[a-z-]+$/.test(name) || !/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)) {
        throw new Error("Unsafe Ondine theme declaration.");
      }
      return `${name}:${value}`;
    });
    const background = variables["--ondine-bg"] ? `background:${variables["--ondine-bg"]};` : "";
    const style = `${declarations.join(";")};${background}${retained}`;
    return /\bstyle="/.test(root)
      ? root.replace(/\bstyle="[^"]*"/, `style="${style}"`)
      : root.replace(/>$/, ` style="${style}">`);
  });
}

export function hasMermaidThemeDirective(source: string): boolean {
  const initBlocks = source.match(/^\s*%%\{[\s\S]*?\}%%/gm) ?? [];
  if (initBlocks.some((block) => /["']?theme(?:Variables|CSS)?["']?\s*:/i.test(block))) return true;
  const frontMatter = source.trimStart().match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  return Boolean(frontMatter && /^\s*["']?theme(?:Variables|CSS)?["']?\s*:/im.test(frontMatter));
}

export const ONDINE_THEME_WARNING =
  "Mermaid theme directives are not applied by Ondine Experimental. Colors use the extension's Beautiful Theme preference.";
