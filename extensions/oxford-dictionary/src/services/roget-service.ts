import path from 'path';
import fs from 'fs';
import { getDefLink, getRogetLink } from './link-server';
import { formatBadgeSection, formatWordBadge } from '../utils/ui-helpers';

export interface RogetSection {
  id: string;
  label: string;
  r: [number, number];
}

export interface RogetClass {
  id: number;
  label: string;
  sections: RogetSection[];
}

export interface RogetEntry {
  id: number;
  title: string;
  classId: number;
  classLabel: string;
  sectionId: string;
  sectionLabel: string;
  body: string;
}

export interface RogetSearchResult {
  entry: RogetEntry;
  matchType: 'exact_id' | 'id_prefix' | 'exact_title' | 'title_match' | 'body_match';
  excerpt?: string;
}

let cachedData: { classes: RogetClass[]; entries: RogetEntry[] } | null = null;
let entryMap: Map<number, RogetEntry> | null = null;

function loadData(): { classes: RogetClass[]; entries: RogetEntry[] } {
  if (cachedData) return cachedData;

  // Search candidate locations for roget-thesaurus.json
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', 'roget-thesaurus.json'),
    path.join(__dirname, '..', 'assets', 'roget-thesaurus.json'),
    path.join(__dirname, 'assets', 'roget-thesaurus.json'),
    'C:/Users/Johno/.config/raycast/extensions/oxford-dictionary/assets/roget-thesaurus.json',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf8');
        cachedData = JSON.parse(raw);
        break;
      } catch (err) {
        console.error('Failed reading roget data from', candidate, err);
      }
    }
  }

  if (!cachedData) {
    cachedData = { classes: [], entries: [] };
  }

  entryMap = new Map();
  for (const entry of cachedData.entries) {
    entryMap.set(entry.id, entry);
  }

  return cachedData;
}

export function getRogetClasses(): RogetClass[] {
  return loadData().classes;
}

export function getRogetClass(id: number): RogetClass | undefined {
  return getRogetClasses().find((c) => c.id === id);
}

export function getRogetEntry(id: number): RogetEntry | undefined {
  loadData();
  return entryMap?.get(id);
}

export function getRogetSection(
  classId: number,
  sectionId: string
): { rogetClass: RogetClass; section: RogetSection; entries: RogetEntry[] } | undefined {
  const rogetClass = getRogetClass(classId);
  if (!rogetClass) return undefined;
  const section = rogetClass.sections.find((s) => s.id === sectionId);
  if (!section) return undefined;

  const entries: RogetEntry[] = [];
  for (let i = section.r[0]; i <= section.r[1]; i++) {
    const e = getRogetEntry(i);
    if (e) entries.push(e);
  }

  return { rogetClass, section, entries };
}

/**
 * Searches Roget's Thesaurus by numeric ID or full-text query.
 */
export function searchRoget(rawQuery: string, limit = 50): RogetSearchResult[] {
  const data = loadData();
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const results: RogetSearchResult[] = [];
  const isNumeric = /^\d+$/.test(q);

  if (isNumeric) {
    const targetNum = parseInt(q, 10);
    // 1. Exact ID
    const exact = entryMap?.get(targetNum);
    if (exact) {
      results.push({ entry: exact, matchType: 'exact_id' });
    }

    // 2. ID prefix matches (e.g. "8" matches 80, 81... or "86" matches 860, 861...)
    for (const entry of data.entries) {
      if (entry.id !== targetNum && String(entry.id).startsWith(q)) {
        results.push({ entry, matchType: 'id_prefix' });
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  // Text search
  const exactTitleMatches: RogetSearchResult[] = [];
  const titleMatches: RogetSearchResult[] = [];
  const bodyMatches: RogetSearchResult[] = [];

  for (const entry of data.entries) {
    const titleLower = entry.title.toLowerCase();

    if (titleLower === q) {
      exactTitleMatches.push({ entry, matchType: 'exact_title' });
      continue;
    }

    if (titleLower.includes(q)) {
      titleMatches.push({ entry, matchType: 'title_match' });
      continue;
    }

    const bodyLower = entry.body.toLowerCase();
    const hitIdx = bodyLower.indexOf(q);
    if (hitIdx !== -1) {
      // Create excerpt around match
      const start = Math.max(0, hitIdx - 35);
      const end = Math.min(entry.body.length, hitIdx + q.length + 45);
      let excerpt = entry.body.slice(start, end).replace(/\n/g, ' ').trim();
      if (start > 0) excerpt = '...' + excerpt;
      if (end < entry.body.length) excerpt = excerpt + '...';

      bodyMatches.push({
        entry,
        matchType: 'body_match',
        excerpt,
      });
    }

    if (exactTitleMatches.length + titleMatches.length + bodyMatches.length >= limit * 2) {
      break;
    }
  }

  return [...exactTitleMatches, ...titleMatches, ...bodyMatches].slice(0, limit);
}

/**
 * Extracts referenced category numbers (e.g. "&c. 862", "153") from an entry.
 */
export function extractCrossReferences(entry: RogetEntry): number[] {
  const refs = new Set<number>();
  const regex = /(?:&c\.|\bsee|\bcf\.)?\s*(\d{1,4})/g;
  let match;
  while ((match = regex.exec(entry.body)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 1000 && num !== entry.id) {
      refs.add(num);
    }
  }
  return Array.from(refs).slice(0, 12);
}

/**
 * Turns plain text words in a Roget's thesaurus entry into clickable links (no boxes):
 * - Word tokens link to def: raycast://extensions/johnathan_w/oxford-dictionary/def?fallbackText=...
 * - Numbers link to roget: raycast://extensions/johnathan_w/oxford-dictionary/roget?fallbackText=...
 * Leaves structural notations like &c., adj., v., headers and punctuation intact.
 */
function linkifyRogetBody(bodyText: string, selectedWord?: string): string {
  // Replace brackets [ ] with ( ) so they don't break markdown link parsing
  const sanitized = bodyText.replace(/\[/g, '(').replace(/\]/g, ')');

  const skipTokens = new Set([
    'adj',
    'adv',
    'phr',
    'obs',
    'see',
    'cf',
    'etc',
    'c',
    'n',
    'v',
    'int',
    'al',
    'ibid',
    'vs',
    'videlicet',
    'sc',
  ]);

  return sanitized
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      // Skip markdown headers, blockquotes, horizontal rules
      if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('>') ||
        trimmed.startsWith('---') ||
        trimmed.startsWith('*')
      ) {
        return line;
      }

      return line.replace(/\b([a-zA-Z][a-zA-Z'-]*[a-zA-Z]|[a-zA-Z]|\d{1,4})\b/g, (token) => {
        // If it's a number between 1 and 1000, link to Roget category
        if (/^\d+$/.test(token)) {
          const num = parseInt(token, 10);
          if (num >= 1 && num <= 1000) {
            return `[${token}](${getRogetLink(num)})`;
          }
          return token;
        }

        const lower = token.toLowerCase();
        if (skipTokens.has(lower)) {
          return token;
        }

        const isSelected = selectedWord && lower === selectedWord.toLowerCase();
        const link = getDefLink(lower);
        return isSelected ? `[**✦ ${token} ✦**](${link})` : `[${token}](${link})`;
      });
    })
    .join('\n');
}

/**
 * Formats entry into clean GitHub-flavored markdown with Roget POS headings and clickable words.
 */
export function formatRogetMarkdown(entry: RogetEntry, selectedWord?: string): string {
  const sections = parseRogetEntryWords(entry);
  const sectionMds = sections
    .filter((sec) => sec.words.length > 0)
    .map(
      (sec) =>
        `### ${sec.label}\n\n` +
        formatBadgeSection(sec.words, selectedWord, getDefLink, 5)
    );

  const crossRefs = extractCrossReferences(entry);
  let crossRefMd = '';
  if (crossRefs.length > 0) {
    const refBadges = crossRefs.map((num) => {
      const refEntry = getRogetEntry(num);
      const title = refEntry ? `${num}. ${refEntry.title}` : String(num);
      const isSelected = selectedWord === title || selectedWord === String(num);
      return formatWordBadge(title, isSelected, getRogetLink(num));
    });
    crossRefMd = `### Cross References\n\n` + refBadges.join(' ') + '\n\n';
  }

  const prevId = entry.id > 1 ? entry.id - 1 : 1000;
  const nextId = entry.id < 1000 ? entry.id + 1 : 1;
  const prevEntry = getRogetEntry(prevId);
  const nextEntry = getRogetEntry(nextId);

  const prevLink = prevEntry
    ? `[← **${prevEntry.id}. ${prevEntry.title}**](${getRogetLink(prevId)})`
    : '';

  const nextLink = nextEntry
    ? `[**${nextEntry.id}. ${nextEntry.title}** →](${getRogetLink(nextId)})`
    : '';

  const navLine = [prevLink, nextLink].filter(Boolean).join('  |  ');

  // Clicking the word title itself cycles to the next consecutive entry
  const titleLink = `[${entry.title.toUpperCase()}](${getRogetLink(nextId)})`;

  return `
# ${entry.id}. ${titleLink}

> **${entry.classLabel}** › **${entry.sectionLabel}**

${navLine ? `*${navLine}*\n\n---` : '---'}
 
${sectionMds.join('\n')}
${crossRefMd}
---
*Source: Roget's Thesaurus 1911 Edition via [rrthesaurus.com](https://www.rrthesaurus.com/)*
`.trim();
}



export interface RogetWordSection {
  pos: string;
  label: string;
  words: string[];
}

export function parseRogetEntryWords(entry: RogetEntry): RogetWordSection[] {
  let text = entry.body.replace(/^(\[[^\]]*\]\s*)?[A-Za-z\s,;'-]+—\s*/, '');
  const posRegex = /\b(N|V|Adj|Adv|Int|Phr)\.\s+/g;
  const sections: { pos: string; content: string }[] = [];
  let match: RegExpExecArray | null;
  const matches: { pos: string; index: number; length: number }[] = [];
  while ((match = posRegex.exec(text)) !== null) {
    matches.push({ pos: match[1], index: match.index, length: match[0].length });
  }

  if (matches.length === 0) {
    sections.push({ pos: 'Words', content: text });
  } else {
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const next = matches[i + 1];
      const content = text.substring(cur.index + cur.length, next ? next.index : text.length);
      sections.push({ pos: cur.pos, content: content.trim() });
    }
  }

  const posLabels: Record<string, string> = {
    N: 'Nouns (N.)',
    V: 'Verbs (V.)',
    Adj: 'Adjectives (Adj.)',
    Adv: 'Adverbs (Adv.)',
    Int: 'Interjections (Int.)',
    Phr: 'Phrases (Phr.)',
    Words: 'Words',
  };

  return sections.map((s) => {
    const rawTokens = s.content
      .split(/[;,\n]+/)
      .map((w) =>
        w
          .replace(/\[[^\]]*\]/g, '')
          .replace(/&c\.?/gi, '')
          .replace(/^[—\-\s\d.]+|[—\-\s\d.]+$/g, '')
          .trim()
      )
      .filter((w) => {
        if (!w || w.length < 2) return false;
        if (/^\d+$/.test(w)) return false;
        if (['adj', 'adv', 'phr', 'int', 'v', 'n'].includes(w.toLowerCase())) return false;
        return true;
      });

    const uniqueWords = Array.from(new Set(rawTokens));
    return {
      pos: s.pos,
      label: posLabels[s.pos] || s.pos,
      words: uniqueWords,
    };
  });
}

