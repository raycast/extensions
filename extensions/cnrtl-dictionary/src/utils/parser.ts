import { parse, HTMLElement } from "node-html-parser";
import type {
  DefinitionEntry,
  DefinitionSection,
  DefinitionExample,
  SynonymResult,
  SynonymGroup,
  SynonymEntry,
  SynonymDegree,
  EtymologyEntry,
  MorphologyEntry,
  MorphologyForm,
} from "./types";
import { buildCnrtlUrl } from "./constants";

// ─── Text helpers ─────────────────────────────────────────────────────────────

/**
 * Collapse multiple whitespace chars, trim, and normalise Unicode spaces.
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strip every HTML tag from a string and clean the resulting text.
 */
export function stripTags(html: string): string {
  return cleanText(html.replace(/<[^>]+>/g, " "));
}

/**
 * Try a list of CSS selectors and return the first matching element.
 */
function querySelector(root: HTMLElement, selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// ─── Definition parser ───────────────────────────────────────────────────────

/**
 * Detect whether the page signals "word not found".
 */
export function isNotFoundPage(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("aucune entrée") ||
    lower.includes("introuvable") ||
    lower.includes("not found") ||
    lower.includes("mot inconnu") ||
    (lower.includes("aucun résultat") && !lower.includes("tlf_cvedette"))
  );
}

/**
 * Extract examples from a TLFi section element.
 * Examples appear inside <span class="tlf_cexemple"> or <i> elements.
 */
function extractExamples(el: HTMLElement): DefinitionExample[] {
  const examples: DefinitionExample[] = [];

  const exSpans = el.querySelectorAll(".tlf_cexemple, .tlf_exemple");
  if (exSpans.length > 0) {
    for (const span of exSpans) {
      const text = cleanText(span.text);
      if (text.length > 5) examples.push({ text });
    }
    return examples;
  }

  // Fallback: italic segments often mark examples in older markup
  for (const italic of el.querySelectorAll("i")) {
    const text = cleanText(italic.text);
    if (text.length > 5 && !text.startsWith("[")) {
      examples.push({ text });
    }
  }

  return examples;
}

/**
 * Parse the full definition page HTML returned by cnrtl.fr/definition/<word>.
 */
export function parseDefinitionPage(html: string, word: string): DefinitionEntry {
  const root = parse(html);

  // Remove navigational chrome, scripts, styles
  for (const sel of ["script", "style", "nav", "#vmpasstlf", "#navigation", ".tlf_compteur", "#vtoolbar"]) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // ── Locate the main content area ──
  // NOTE: #vitemselected is the selected nav tab (just the word label), NOT the content.
  // The actual definition lives in #contentbox.
  const content = querySelector(root, ["#contentbox", ".tlf_partie", ".tlf_cvedette"]);

  // ── Headword and part of speech ──
  const headwordEl = querySelector(root, [".tlf_cmot", ".tlf_cvedette .tlf_cmot", "h1"]);
  const extractedWord = headwordEl ? cleanText(headwordEl.text) : word;

  const posEl = querySelector(root, [".tlf_ccode", ".tlf_pos", ".tlf_nature"]);
  const partOfSpeech = posEl ? cleanText(posEl.text) : undefined;

  // ── Variant spellings ──
  const variants: string[] = [];
  root.querySelectorAll(".tlf_cvar, .tlf_variante").forEach((el) => {
    const v = cleanText(el.text);
    if (v && v !== extractedWord) variants.push(v);
  });

  // ── Main sections ──
  // CNRTL/TLFi structure: each sense is a .tlf_cdefinition element whose parent
  // (.tlf_parah or .tlf_paraputir) also contains a .tlf_cplan label (A, B, 1, 2…).
  const sections: DefinitionSection[] = [];

  if (content) {
    const defEls = content.querySelectorAll(".tlf_cdefinition");

    for (const defEl of defEls) {
      const defText = cleanText(defEl.text);
      if (!defText || defText.length < 5) continue;

      const parent = defEl.parentNode as HTMLElement | null;

      // Section label from the nearest .tlf_cplan sibling
      const planEl = parent?.querySelector(".tlf_cplan");
      const label = planEl
        ? cleanText(planEl.text)
            .replace(/\s*[−–]\s*$/, "")
            .trim()
        : String(sections.length + 1);

      // Optional qualifier: domain or usage label
      const qualEl = parent?.querySelector(".tlf_cdomaine, .tlf_cemploi, .tlf_ccrochet");
      const qualifier = qualEl ? cleanText(qualEl.text) : undefined;

      sections.push({
        label,
        qualifier,
        text: defText,
        examples: parent ? extractExamples(parent) : [],
        subSections: [],
      });
    }

    // Fallback: split raw text into pseudo-sections
    if (sections.length === 0) {
      const rawText = cleanText(content.text);
      const chunks = rawText.split(/\s{3,}/).filter((s) => s.length > 20);
      chunks.forEach((chunk, i) => sections.push({ label: String(i + 1), text: chunk, examples: [], subSections: [] }));
    }
  }

  const rawText = content ? cleanText(content.text) : word;

  return {
    word: extractedWord || word,
    partOfSpeech,
    variants: variants.length > 0 ? variants : undefined,
    sections,
    rawText,
    url: buildCnrtlUrl("definition", word),
  };
}

// ─── Synonym / Antonym parser ─────────────────────────────────────────────────

/**
 * Parse degree value from the text near a synonym link.
 * CNRTL encodes degree as a number 1–3 next to the link.
 */
function parseDegree(text: string): SynonymDegree | undefined {
  const match = text.match(/\b([123])\b/);
  if (!match) return undefined;
  const n = parseInt(match[1], 10);
  return (n >= 1 && n <= 3 ? n : undefined) as SynonymDegree | undefined;
}

/**
 * Parse the synonym (or antonym) page HTML.
 * Endpoint is either "synonymie" or "antonymie".
 */
export function parseSynonymPage(html: string, word: string, endpoint: "synonymie" | "antonymie"): SynonymResult {
  const root = parse(html);

  for (const sel of ["script", "style", "nav"]) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const groups: SynonymGroup[] = [];

  // ── Strategy 1: CNRTL synonym table with rows/degree ──
  const tableArea = querySelector(root, [
    "#syno_format",
    "#anto_format",
    ".syno_format",
    ".anto_format",
    "#contentbox table",
    "table",
  ]);

  if (tableArea) {
    const rows = tableArea.querySelectorAll("tr");
    let currentGroup: SynonymGroup = { entries: [] };

    for (const row of rows) {
      const cells = row.querySelectorAll("td, th");
      if (cells.length === 0) continue;

      // A header row signals a new group
      if (cells[0].tagName === "TH" || row.querySelector("th")) {
        if (currentGroup.entries.length > 0) groups.push(currentGroup);
        currentGroup = {
          label: cleanText(cells[0].text) || undefined,
          entries: [],
        };
        continue;
      }

      // Data row: look for links to synonyms
      const links = row.querySelectorAll("a[href]");
      for (const link of links) {
        const linkWord = cleanText(link.text);
        if (!linkWord || linkWord.toLowerCase() === word.toLowerCase()) continue;

        const rowText = cleanText(row.text);
        const degree = parseDegree(rowText.replace(linkWord, ""));
        const href = link.getAttribute("href") ?? "";
        const url = href.startsWith("http") ? href : `https://www.cnrtl.fr/${endpoint}/${encodeURIComponent(linkWord)}`;

        currentGroup.entries.push({ word: linkWord, degree, url });
      }
    }

    if (currentGroup.entries.length > 0) groups.push(currentGroup);
  }

  // ── Strategy 2: flat link list (some CNRTL pages use this layout) ──
  if (groups.length === 0) {
    const container = querySelector(root, ["#contentbox", "body"]);
    if (container) {
      const entries: SynonymEntry[] = [];
      for (const link of container.querySelectorAll("a[href]")) {
        const linkWord = cleanText(link.text);
        if (!linkWord || linkWord.toLowerCase() === word.toLowerCase()) continue;
        const href = link.getAttribute("href") ?? "";
        if (!href.includes(endpoint)) continue;
        const url = href.startsWith("http") ? href : `https://www.cnrtl.fr/${endpoint}/${encodeURIComponent(linkWord)}`;
        entries.push({ word: linkWord, url });
      }
      if (entries.length > 0) groups.push({ entries });
    }
  }

  return {
    word,
    groups,
    url: buildCnrtlUrl(endpoint, word),
  };
}

// ─── Etymology parser ─────────────────────────────────────────────────────────

/**
 * Parse the etymology page HTML from cnrtl.fr/etymologie/<word>.
 */
export function parseEtymologyPage(html: string, word: string): EtymologyEntry {
  const root = parse(html);

  for (const sel of ["script", "style", "nav", "#navigation"]) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const content = querySelector(root, ["#vitemselected", "#contentbox", ".etym_content", "body"]);

  const rawContent = content ? cleanText(content.text) : "";

  // Try to extract period (e.g. "XIIe s.", "1680", "Fin XIVe s.")
  // Require Roman numerals to be followed by ordinal 'e'/'er' to avoid matching lone letters.
  const periodMatch = rawContent.match(
    /\b((?:début\s+|fin\s+|milieu\s+)?(?:[XIVLCDM]{2,7}e(?:r)?|[0-9]{3,4})\s*(?:s\.|siècle)?)/i
  );
  const period = periodMatch ? periodMatch[1].trim() : undefined;

  // Try to extract origin language
  const originMatch = rawContent.match(
    /\b(latin\s+\w+|grec\s+(?:ancien\s+)?\w+|ancien\s+français|francique|germanique|arabe|italien|espagnol|anglais)/i
  );
  const origin = originMatch ? originMatch[1] : undefined;

  return {
    period,
    origin,
    content: rawContent || word,
    url: buildCnrtlUrl("etymologie", word),
  };
}

// ─── Morphology parser ────────────────────────────────────────────────────────

/**
 * Parse the morphology page HTML from cnrtl.fr/morphologie/<word>.
 * The page contains a conjugation/declension table.
 */
export function parseMorphologyPage(html: string, word: string): MorphologyEntry {
  const root = parse(html);

  for (const sel of ["script", "style", "nav"]) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // Detect grammatical category from page heading
  const catEl = querySelector(root, [".morph_cat", ".morph_type", "h1", "h2"]);
  const category = catEl ? cleanText(catEl.text).toLowerCase() : undefined;

  const forms: MorphologyForm[] = [];

  // ── Parse table-based morphology ──
  const tables = root.querySelectorAll("table");
  for (const table of tables) {
    const rows = table.querySelectorAll("tr");
    let colHeaders: string[] = [];

    for (const row of rows) {
      const ths = row.querySelectorAll("th");
      const tds = row.querySelectorAll("td");

      if (ths.length > 0 && tds.length === 0) {
        // Header row: capture column labels
        colHeaders = Array.from(ths).map((th) => cleanText(th.text));
        continue;
      }

      if (tds.length > 0) {
        const rowLabel = ths.length > 0 ? cleanText(ths[0].text) : "";
        tds.forEach((td, i) => {
          const form = cleanText(td.text);
          if (!form) return;
          const colLabel = colHeaders[i] ?? `col${i + 1}`;
          const label = [rowLabel, colLabel].filter(Boolean).join(" – ");
          forms.push({ label: label || `Forme ${forms.length + 1}`, form });
        });
      }
    }
  }

  // ── Fallback: flat list ──
  if (forms.length === 0) {
    const container = querySelector(root, ["#contentbox", "body"]);
    if (container) {
      const text = cleanText(container.text);
      text
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((f, i) => {
          forms.push({ label: `Forme ${i + 1}`, form: f });
        });
    }
  }

  return {
    word,
    category,
    forms,
    url: buildCnrtlUrl("morphologie", word),
  };
}
