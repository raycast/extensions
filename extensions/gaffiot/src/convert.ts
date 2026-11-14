/**
 * Convertit le Gaffiot 2016 (version « komarov », G. Gréco et al.) du JSON
 * balisé TeX (Gaffiot/digital-gaffiot-json) en deux structures exploitables
 * par l'extension :
 *
 *   index  [clé, titre, n° homonyme, offset, longueur] par article
 *   dat    corps des articles en Markdown, concaténés (UTF-8)
 *
 * Module pur (sans @raycast/api) : la conversion s'exécute sur la machine de
 * l'utilisateur, les données ne sont jamais redistribuées avec l'extension.
 */

/** À incrémenter à chaque changement du rendu : force la reconversion des données installées. */
export const DATA_VERSION = 1;

/** Article tel que fourni par gaffiot.json. */
export interface RawEntry {
  latin: string;
  latin_raw: string;
  french: string;
}

/** Ligne d'index : [clé normalisée, titre affiché, n° d'homonyme (0 = aucun), offset, longueur en octets]. */
export type IndexRow = [string, string, number, number, number];

// ─── Rendu TeX → Markdown ───────────────────────────────────────────────────
const SUP: Record<string, string> = {
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
};
const superscript = (s: string) => [...s].map((c) => SUP[c] ?? c).join("");

// Macros dont l'argument s'affiche en italique (latin, œuvres, auteurs…)
const ITALIC = new Set([
  "cl",
  "lat",
  "latv",
  "latc",
  "latp",
  "latpf",
  "latdim",
  "latgen",
  "latpl",
  "freq",
  "gen",
  "oeuv",
  "ital",
  "desv",
  "aut",
  "autz",
  "autp",
]);
// Macros dont l'argument s'affiche en gras (variantes de vedette)
const BOLD = new Set(["el", "es", "gras"]);
// Les macros transparentes (refch, des, grec, latin, text…) et inconnues gardent leur argument tel quel.
// Macros à argument dont le contenu est supprimé
const DROP_ARG = new Set(["kkz"]);
// Macros sans argument supprimées (mise en page TeX)
const DROP = new Set([
  "vfill",
  "eject",
  "begintriplecolumns",
  "endtriplecolumns",
  "unskip",
  "goodbreak",
  "nobreak",
  "hfil",
  "arabe",
  "dixpc",
  "neufrm",
  "douzerm",
  "dixrmchif",
  "relax",
  "break",
]);
// Macros suivies d'une dimension (\kern-0.2em, \raise0.1em, \hskip 0.5em, \penalty5000)
const DIMENSION = new Set(["kern", "raise", "hskip", "penalty", "vskip", "lower"]);

interface Context {
  italic: boolean;
  bold: boolean;
}

const escapeMd = (s: string) => s.replace(/([*_`[\]<>\\#])/g, "\\$1");

/** Lit un groupe {…} équilibré à partir de la position `i` (qui pointe sur `{`). */
function readGroup(src: string, i: number): [string, number] {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return [src.slice(i + 1, j), j + 1];
    }
  }
  return [src.slice(i + 1), src.length];
}

function render(src: string, ctx: Context = { italic: false, bold: false }): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === "\\") {
      const m = /^\\([a-zA-Z]+)\s*/.exec(src.slice(i));
      if (!m) {
        // \{ \} \% \& \$ etc. → caractère littéral
        out += escapeMd(src[i + 1] ?? "");
        i += 2;
        continue;
      }
      const name = m[1];
      i += m[0].length;

      if (DIMENSION.has(name)) {
        const d = /^-?\d*\.?\d+\s*(em|ex|pt|mm|cm)?\s*/.exec(src.slice(i));
        if (d) i += d[0].length;
        continue;
      }
      if (DROP.has(name)) continue;
      if (name === "par" || name === "F") {
        out += name === "F" ? "\n\n¶ " : "\n\n";
        continue;
      }
      if (name === "S") {
        if (src[i] === "{") i = readGroup(src, i)[1];
        out += "§";
        continue;
      }
      if (name === "string") {
        out += escapeMd(src[i] ?? "");
        i += 1;
        continue;
      }
      if (name === "thinspace") {
        out += " ";
        continue;
      }
      if (name === "times") {
        out += "×";
        continue;
      }
      if (name === "oe") {
        out += "œ";
        continue;
      }

      // Macros à argument
      let arg = "";
      if (src[i] === "{") [arg, i] = readGroup(src, i);

      if (DROP_ARG.has(name)) continue;
      if (name === "up") {
        out += superscript(render(arg, ctx));
        continue;
      }
      if (name === "pp") {
        out += `\n\n**${render(arg, ctx)}** `;
        continue;
      }
      if (name === "qq" || name === "qqng") {
        out += `\n\n&nbsp;&nbsp;&nbsp;**${render(arg, ctx)}** `;
        continue;
      }
      if (name === "rub") {
        out += `\n\n### ${render(arg, ctx)}\n\n`;
        continue;
      }
      if (name === "comm") {
        out += ` ⟦${render(arg, ctx)}⟧`;
        continue;
      }
      if (ITALIC.has(name)) {
        const inner = render(arg, { ...ctx, italic: true });
        // auteurs et œuvres : l'abréviation garde son point (« Cic. », « Off. »)
        const keepPunct = name === "aut" || name === "autz" || name === "autp" || name === "oeuv";
        out += ctx.italic || !inner.trim() ? inner : wrap(inner, "*", keepPunct);
        continue;
      }
      if (BOLD.has(name)) {
        const inner = render(arg, { ...ctx, bold: true });
        out += ctx.bold || !inner.trim() ? inner : wrap(inner, "**", false);
        continue;
      }
      // Macros transparentes et inconnues : argument brut
      out += render(arg, ctx);
      continue;
    }

    if (c === "{") {
      const [inner, next] = readGroup(src, i);
      out += render(inner, ctx);
      i = next;
      continue;
    }
    if (c === "}") {
      i++;
      continue;
    }
    if (c === "$") {
      i++;
      continue;
    }
    if (c === "~") {
      out += " ";
      i++;
      continue;
    }
    if (c === "-" && src[i + 1] === "-") {
      out += "–";
      i += 2;
      continue;
    }
    if (c === "|" && src[i + 1] === "|") {
      out += "\n\n‖ ";
      i += 2;
      continue;
    }
    if (c === "\n") {
      out += " ";
      i++;
      continue;
    }
    out += escapeMd(c);
    i++;
  }
  return out;
}

/** Entoure de marqueurs Markdown en gardant les espaces / ponctuation finale hors emphase. */
function wrap(text: string, mark: string, keepPunct: boolean): string {
  const m = /^(\s*)(.*?)(\s*)$/s.exec(text);
  if (!m) return text;
  let [, lead, core] = m;
  const trail = m[3];
  let tail = "";
  if (!keepPunct) {
    // ponctuation initiale (« \cl{; accepimus} ») hors emphase
    const lp = /^([,;:.]+\s*)(.*)$/s.exec(core);
    if (lp && lp[2].trim()) {
      lead += lp[1];
      core = lp[2];
    }
    // la ponctuation finale (et l'espace française qui la précède) sort de l'emphase
    const punct = /^(.*?)(\s*[,;:.)\]]+)$/s.exec(core);
    if (punct && punct[1].trim()) {
      core = punct[1].trimEnd();
      tail = punct[2];
    }
  }
  core = core.trim();
  if (!core) return text;
  return `${lead}${mark}${core}${mark}${tail}${trail}`;
}

function tidy(md: string): string {
  return md
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "")
    .replace(/^(\n\n)?‖ /, "")
    .trim();
}

// ─── Clé de recherche ───────────────────────────────────────────────────────
/** Normalisation des vedettes et des requêtes : sans diacritiques, æ→ae, j→i, v→u. */
export function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/j/g, "i")
    .replace(/v/g, "u")
    .replace(/[^a-z0-9 .'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Construction ───────────────────────────────────────────────────────────
/**
 * Conversion article par article : ni le JSON source (27 Mo) ni les corps convertis
 * ne restent en mémoire, une commande Raycast étant limitée à 100 Mo de tas.
 */
export class GaffiotConverter {
  readonly index: IndexRow[] = [];
  private offset = 0;

  /** Convertit un article ; renvoie son corps Markdown encodé, à écrire à la suite de gaffiot.dat. */
  add(e: RawEntry): Buffer {
    const rawMatch = /^(\d+)\s+(.*)$/.exec(e.latin_raw.trim());
    const homonym = rawMatch ? Number(rawMatch[1]) : 0;
    const keyBase = rawMatch ? rawMatch[2] : e.latin_raw.trim();

    const title = render(e.latin)
      .trim()
      .replace(/^\d+\s+/, "")
      .replace(/[,\s]+$/, "");

    const buf = Buffer.from(tidy(render(e.french)), "utf8");
    this.index.push([normalizeKey(keyBase), title, homonym, this.offset, buf.length]);
    this.offset += buf.length;
    return buf;
  }
}

/**
 * Découpe un tableau JSON d'objets reçu par morceaux et rend chaque objet dès qu'il est complet.
 * Suffisant pour gaffiot.json : un tableau d'objets plats, sans chaîne hors des objets.
 */
export class JsonArraySplitter {
  private depth = 0;
  private inString = false;
  private escaped = false;
  private closed = false;
  private pending = "";

  push(text: string, onObject: (json: string) => void): void {
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (c === "\\") this.escaped = true;
        else if (c === '"') this.inString = false;
      } else if (c === '"') this.inString = true;
      else if (c === "{") {
        if (this.depth++ === 0) start = i;
      } else if (c === "}" && --this.depth === 0) {
        onObject(this.pending + text.slice(start, i + 1));
        this.pending = "";
      } else if (c === "]" && this.depth === 0) this.closed = true;
    }
    if (this.depth > 0) this.pending += text.slice(start);
  }

  /** Tableau refermé par son `]` : sinon le flux est tronqué, y compris entre deux articles. */
  get complete(): boolean {
    return this.closed && this.depth === 0;
  }
}
