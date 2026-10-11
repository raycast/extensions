// Shared, editor-free logic for the IconOven extensions (VS Code, Raycast, Webflow).
// No editor imports here so node --test can load it directly.
import { renderSvg, VARIANTS, type El, type IconMaster, type Variant } from "@iconoven/icons";
import { all } from "@iconoven/icons/all";
type PopBodies = { round: Record<string, string>; sharp: Record<string, string> };
import renamedJson from "./renamed.json";

export type Format = "svg" | "jsx" | "vue" | "svelte" | "angular" | "webcomponent" | "name";
export type Corners = "rounded" | "sharp";
export type StrokeWidth = 1 | 1.5 | 2;

export const FORMATS: { id: Format; label: string; detail: string }[] = [
  { id: "svg", label: "SVG Markup", detail: "Inline <svg> element" },
  { id: "jsx", label: "React JSX", detail: "@iconoven/react component and import" },
  { id: "vue", label: "Vue", detail: "@iconoven/vue component and import" },
  { id: "svelte", label: "Svelte", detail: "@iconoven/svelte component and import" },
  { id: "angular", label: "Angular", detail: "@iconoven/angular ioIcon and import" },
  { id: "webcomponent", label: "Web Component", detail: "<iconoven-icon> custom element" },
  { id: "name", label: "Icon Name", detail: "Plain kebab-case name" },
];

export { VARIANTS };
/** Every style: the 12 the renderer draws and Pop, which comes as ready SVG bodies. */
export type Style = Variant | "pop";
export const STYLES: readonly { id: Style; label: string }[] = [
  ...VARIANTS.map((v) => ({ id: v.id, label: v.label })),
  { id: "pop", label: "Pop" },
];
export const PRO_URL = "https://iconoven.com/icons/pro";
export const PRO_NOTE = `Stroke is free under MIT. The other ${STYLES.length - 1} styles need an IconOven Pro licence key: ${PRO_URL}`;
export const ICON_COUNT_COPY = "85,000+ icons";

export interface SnippetOptions {
  variant?: Style;
  strokeWidth?: StrokeWidth;
  corners?: Corners;
  size?: number;
  /** Prefix for mask/gradient ids (Pro styles); must differ per icon on one page. Default io-<name>. */
  id?: string;
}

export interface IndexEntry {
  name: string;
  category: string;
  tags: string[];
  aliases: string[];
  /** Component name used by @iconoven/react, vue, svelte (PascalCase + "Icon"). */
  component: string;
  master: IconMaster;
}

/** Same as tools/load.ts pascal(); the framework packages append "Icon". */
export const pascal = (s: string) =>
  s
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
export const componentName = (name: string) => pascal(name) + "Icon";
const RESERVED = new Set(
  "break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield await arguments eval".split(
    " ",
  ),
);
/** Same as tools/load.ts camel(): the icon data export name (used by @iconoven/angular). */
export const camel = (name: string) => {
  const p = pascal(name),
    c = p[0].toLowerCase() + p.slice(1);
  return RESERVED.has(c) ? c + "Icon" : c;
};
const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/** Only the Stroke style is free; every other style is IconOven Pro. */
export const isPro = (variant: Style | undefined) => !!variant && variant !== "stroke";

// ---------- Pro data (loaded with a licence key, shared/pro.ts) ----------
let roles: Record<string, string> | null = null;
let pop: PopBodies | null = null;
const proMasters = new Map<string, IconMaster>();

/** Sets (or clears, with null) the Pro data a verified key loaded. Pop may come later or not at all. */
export function setProData(data: { roles?: Record<string, string> | null; pop?: PopBodies | null }) {
  if ("roles" in data) {
    roles = data.roles ?? null;
    proMasters.clear();
  }
  if ("pop" in data) pop = data.pop ?? null;
}
/** True when the style draws for real now: Stroke always, Pop with its bodies, the rest with the roles. */
export const hasStyle = (style: Style | undefined) => !isPro(style) || (style === "pop" ? !!pop : !!roles);

const KIND = { s: "shape", l: "line", c: "cut" } as const;
/** Role codes onto the free elements, in order (as plugins/figma/src/look.js). */
function withRoles(els: El[], codes: string[]): El[] {
  return els.map((e, i) => {
    const c = codes[i];
    if (!c) return e;
    const out: El = { ...e, kind: KIND[c[0] as keyof typeof KIND], role: c[1] as "p" | "s" };
    if (c.includes("k", 2)) out.knock = "s";
    if (c.includes("f", 2)) out.fillcut = true;
    return out;
  });
}
/** The master a role-based Pro style draws: the free geometry with the icon's roles. */
function proMaster(m: IconMaster): IconMaster {
  const code = roles?.[m.name];
  if (!code) return m;
  let pm = proMasters.get(m.name);
  if (!pm) {
    const [main, badge] = code.split(" | ").map((x) => x.split(" "));
    pm = {
      ...m,
      els: withRoles(m.els, main),
      ...(m.badge ? { badge: { ...m.badge, els: withRoles(m.badge.els, badge ?? []) } } : null),
    };
    proMasters.set(m.name, pm);
  }
  return pm;
}

/**
 * Pop as a standalone <svg>, like popSvg from @iconoven-pro/icons/pop: colours follow the --pop-* CSS variables with
 * their light fallbacks. inline bakes the fallbacks in as attributes, for places without CSS (the Webflow canvas).
 */
export function popSvgFor(
  name: string,
  { size = 24, corners = "rounded", inline = false }: { size?: number; corners?: Corners; inline?: boolean } = {},
): string | null {
  let b = pop?.[corners === "sharp" ? "sharp" : "round"][name];
  if (!b) return null;
  if (inline)
    b = b
      .replace(/var\(--pop-[a-z-]+,(#[0-9A-Fa-f]{6})\)/g, "$1")
      .replace(/\sstyle="([^"]*)"/g, (_: string, css: string) =>
        css
          .split(";")
          .filter(Boolean)
          .map((d) => {
            const [k, v] = d.split(":");
            return ` ${k.trim()}="${v.trim()}"`;
          })
          .join(""),
      );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
}

let cache: { list: IndexEntry[]; byName: Map<string, IndexEntry> } | null = null;

/** Builds (once) the searchable index of every icon. Aliases come from master.aliases and the 0.1.x renames. */
export function loadIndex(): IndexEntry[] {
  if (cache) return cache.list;
  const masters = Object.values(all as Record<string, IconMaster>);
  const byPascal = new Map(masters.map((m) => [pascal(m.name), m.name]));
  const extra = new Map<string, string[]>();
  const renamed = (renamedJson as { renamed: Record<string, string> }).renamed;
  for (const [oldName, newName] of Object.entries(renamed)) {
    const target = byPascal.get(newName);
    if (!target) continue;
    const list = extra.get(target) ?? [];
    list.push(kebab(oldName));
    extra.set(target, list);
  }
  const list = masters
    .map((m) => ({
      name: m.name,
      category: m.category,
      tags: m.tags ?? [],
      aliases: [...new Set([...(m.aliases ?? []), ...(extra.get(m.name) ?? [])])].filter((a) => a !== m.name),
      component: componentName(m.name),
      master: m,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  cache = { list, byName: new Map(list.map((e) => [e.name, e])) };
  return list;
}

export function getIcon(name: string): IndexEntry | undefined {
  loadIndex();
  return cache!.byName.get(name);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

/** Subsequence match: 0 when the letters are not all present in order, higher when they sit closer together. */
function fuzzy(term: string, text: string): number {
  let i = 0,
    gaps = 0,
    last = -1;
  for (let j = 0; j < text.length && i < term.length; j++) {
    if (text[j] === term[i]) {
      if (last >= 0) gaps += j - last - 1;
      last = j;
      i++;
    }
  }
  return i === term.length ? Math.max(1, 60 - gaps * 4) : 0;
}

function scoreTerm(term: string, e: IndexEntry): number {
  const words = e.name.split("-");
  if (e.name === term) return 1000;
  if (e.aliases.includes(term)) return 900;
  if (e.name.startsWith(term)) return 700;
  if (words.includes(term)) return 600;
  if (e.tags.includes(term)) return 500;
  if (e.name.includes(term)) return 400;
  if (e.aliases.some((a) => a.includes(term))) return 350;
  if (e.tags.some((t) => t.startsWith(term))) return 300;
  if (e.category === term) return 200;
  if (term.length < 3) return 0;
  return Math.max(fuzzy(term, e.name), ...e.aliases.map((a) => fuzzy(term, a) * 0.8));
}

/**
 * Ranks icons for a query: exact name, then alias, name prefix, name word, tag, substrings,
 * category and finally a fuzzy subsequence match. Every word in the query has to match.
 */
export function search(query: string, limit = 50): IndexEntry[] {
  const list = loadIndex();
  const q = norm(query);
  if (!q) return list.slice(0, limit);
  const terms = q.split("-").filter(Boolean);
  const scored: { e: IndexEntry; s: number }[] = [];
  for (const e of list) {
    let s = 0;
    if (terms.length > 1) {
      // the whole query as one name/alias counts first, e.g. "arrow left" -> arrow-left
      const whole = scoreTerm(q, e);
      if (whole >= 400) s = whole + 100;
    }
    if (!s) {
      for (const t of terms) {
        const ts = scoreTerm(t, e);
        if (!ts) {
          s = 0;
          break;
        }
        s += ts / terms.length;
      }
    }
    if (s > 0) scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s || a.e.name.length - b.e.name.length || a.e.name.localeCompare(b.e.name));
  return scored.slice(0, limit).map((x) => x.e);
}

/**
 * Standalone SVG string for an icon, what renderSvg from @iconoven/icons returns. A Pro style draws with the Pro data
 * a key loaded; a style that isn't loaded draws Stroke (check hasStyle first).
 */
export function svgFor(name: string, opts: SnippetOptions & { inline?: boolean } = {}): string {
  const e = getIcon(name);
  if (!e) throw new Error(`IconOven: no icon named "${name}"`);
  const style = opts.variant ?? "stroke";
  if (style === "pop") {
    const svg = popSvgFor(name, { size: opts.size, corners: opts.corners, inline: opts.inline });
    if (svg) return svg;
  }
  const variant = style === "pop" || !hasStyle(style) ? "stroke" : style;
  return renderSvg(variant === "stroke" ? e.master : proMaster(e.master), {
    variant,
    id: opts.id ?? `io-${name}`,
    strokeWidth: opts.strokeWidth,
    corners: opts.corners,
    ...(opts.size ? { size: opts.size } : null),
  });
}

export interface SnippetParts {
  /** Import line to add at the top of the file, when the format needs one. */
  imports?: string;
  /** Markup to place at the cursor. */
  usage: string;
}

function props(opts: SnippetOptions, style: "jsx" | "vue" | "angular" | "html"): string {
  const out: string[] = [];
  const attr = (camel: string, kebabName: string, v: string | number, numeric: boolean) => {
    if (style === "jsx") out.push(numeric ? `${camel}={${v}}` : `${camel}="${v}"`);
    else if (style === "vue") out.push(numeric ? `:${kebabName}="${v}"` : `${kebabName}="${v}"`);
    else if (style === "angular") out.push(numeric ? `[${camel}]="${v}"` : `${camel}="${v}"`);
    else out.push(`${kebabName}="${v}"`);
  };
  if (opts.variant && opts.variant !== "stroke") attr("variant", "variant", opts.variant, false);
  if (opts.strokeWidth && opts.strokeWidth !== 1.5) attr("strokeWidth", "stroke-width", opts.strokeWidth, true);
  if (opts.corners === "sharp") attr("corners", "corners", "sharp", false);
  if (opts.size && opts.size !== 24) attr("size", "size", opts.size, true);
  return out.length ? " " + out.join(" ") : "";
}

/** Pop has no variant prop: it is ready SVG, so every code format inserts SVG markup for it. */
export const formatFor = (format: Format, opts: SnippetOptions = {}): Format =>
  opts.variant === "pop" && format !== "name" ? "svg" : format;

export function snippetParts(name: string, format: Format, opts: SnippetOptions = {}): SnippetParts {
  const e = getIcon(name);
  if (!e) throw new Error(`IconOven: no icon named "${name}"`);
  format = formatFor(format, opts);
  const C = e.component;
  switch (format) {
    case "svg":
      return { usage: svgFor(name, opts) };
    case "jsx":
      return { imports: `import { ${C} } from '@iconoven/react'`, usage: `<${C}${props(opts, "jsx")} />` };
    case "vue":
      return { imports: `import { ${C} } from '@iconoven/vue'`, usage: `<${C}${props(opts, "vue")} />` };
    case "svelte":
      return { imports: `import { ${C} } from '@iconoven/svelte'`, usage: `<${C}${props(opts, "jsx")} />` };
    // @iconoven/angular: IconComponent goes in the component's imports and the icon data on a component field
    case "angular": {
      const d = camel(name);
      return {
        imports:
          `import { IconComponent, ${d} } from '@iconoven/angular'\n\n` +
          `// In your @Component: imports: [IconComponent]; in the class: ${d} = ${d};`,
        usage: `<svg ioIcon [icon]="${d}"${props(opts, "angular")}></svg>`,
      };
    }
    case "webcomponent":
      return {
        imports: `import '@iconoven/web-component/auto'`,
        usage: `<iconoven-icon name="${name}"${props(opts, "html")}></iconoven-icon>`,
      };
    case "name":
      return { usage: name };
  }
}

/** Full snippet text: import line (if any), a blank line, then the markup. */
export function toSnippet(name: string, format: Format, opts: SnippetOptions = {}): string {
  const p = snippetParts(name, format, opts);
  return p.imports ? `${p.imports}\n\n${p.usage}` : p.usage;
}

/** data: URI of the SVG, for image previews (Raycast markdown, Webflow grid). */
export function svgDataUri(name: string, opts: SnippetOptions = {}, color = "#171717"): string {
  const svg = svgFor(name, { ...opts, size: opts.size ?? 24 }).replace("<svg ", `<svg color="${color}" `);
  return (
    "data:image/svg+xml;base64," +
    (globalThis as unknown as { btoa(s: string): string }).btoa(unescape(encodeURIComponent(svg)))
  );
}
