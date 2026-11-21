import { Color, Icon } from '@raycast/api';
import { PartOfSpeech, WordResult, MeaningGroup, SynonymItem } from '../types/dictionary';
import { getDefLink, getSpeakLink } from '../services/link-server';

export function getPosColor(pos: PartOfSpeech): Color {
  switch (pos) {
    case 'noun':
      return Color.Blue;
    case 'verb':
      return Color.Green;
    case 'adjective':
      return Color.Orange;
    case 'adverb':
      return Color.Purple;
    case 'preposition':
    case 'conjunction':
    case 'pronoun':
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

export function getPosIcon(pos: PartOfSpeech): Icon {
  switch (pos) {
    case 'noun':
      return Icon.Box;
    case 'verb':
      return Icon.Bolt;
    case 'adjective':
      return Icon.Star;
    case 'adverb':
      return Icon.Forward;
    default:
      return Icon.Tag;
  }
}

/**
 * Generates an SVG data URI for a rounded box badge:
 * - Standard: unselected #262628 (border #3e3e42), selected #545458 (border #ffffff)
 * - Vector: unselected #102a16 (border #238636), selected #2ea043 (border #ffffff)
 * - Word text in crisp white (#ffffff)
 * - Rounded edges (rx=5, ry=5)
 */
export function createWordBadgeSvg(
  word: string,
  isSelected: boolean,
  variant: 'standard' | 'vector' = 'standard'
): string {
  const charWidth = 7.5;
  const padding = 18;
  const width = Math.max(45, Math.round(word.length * charWidth + padding));
  const height = 24;
  const isVector = variant === 'vector';

  const bg = isSelected
    ? isVector
      ? '#2ea043'
      : '#545458'
    : isVector
    ? '#102a16'
    : '#262628';
  const border = isSelected
    ? '#ffffff'
    : isVector
    ? '#238636'
    : '#3e3e42';
  const strokeWidth = isSelected ? 1.5 : isVector ? 1.2 : 1;
  const textFill = '#ffffff';
  const fontWeight = isSelected ? '600' : '500';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" rx="5" ry="5" fill="${bg}" stroke="${border}" stroke-width="${strokeWidth}"/>
  <text x="${width / 2}" y="${height / 2 + 4}" fill="${textFill}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="${fontWeight}" text-anchor="middle">${word}</text>
</svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

export function formatWordBadge(
  word: string,
  isSelected: boolean,
  link: string,
  variant: 'standard' | 'vector' = 'standard'
): string {
  const svgUri = createWordBadgeSvg(word, isSelected, variant);
  return `[![${word}](${svgUri})](${link})`;
}

export function formatBadgeRow(
  words: string[],
  selectedWord: string | undefined,
  getLink: (w: string) => string,
  vectorWords?: Set<string>
): string {
  return words
    .map((w) => {
      const isSelected = selectedWord ? w.toLowerCase() === selectedWord.toLowerCase() : false;
      const isVector = vectorWords ? vectorWords.has(w.toLowerCase()) : false;
      return formatWordBadge(w, isSelected, getLink(w), isVector ? 'vector' : 'standard');
    })
    .join(' ');
}

export function formatBadgeSection(
  words: string[],
  selectedWord: string | undefined,
  getLink: (w: string) => string,
  cols = 5,
  vectorWords?: Set<string>
): string {
  const rows: string[] = [];
  for (let i = 0; i < words.length; i += cols) {
    const rowWords = words.slice(i, i + cols);
    rows.push(formatBadgeRow(rowWords, selectedWord, getLink, vectorWords));
  }
  return rows.join('  \n') + '\n\n';
}

export function buildGridRows(
  wordGroups: string[][],
  cols = 5
): {
  allWords: string[];
  rows: number[][];
} {
  const allWords: string[] = [];
  const rows: number[][] = [];

  for (const group of wordGroups) {
    if (group.length === 0) continue;
    let currentRow: number[] = [];
    for (const word of group) {
      const idx = allWords.length;
      allWords.push(word);
      currentRow.push(idx);
      if (currentRow.length === cols) {
        rows.push(currentRow);
        currentRow = [];
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
  }

  return { allWords, rows };
}

export function getNextGridIndex(
  currentIndex: number,
  rows: number[][],
  direction: 'up' | 'down' | 'left' | 'right',
  total: number
): number {
  if (total === 0 || rows.length === 0) return 0;

  if (direction === 'right') {
    return (currentIndex + 1) % total;
  }
  if (direction === 'left') {
    return (currentIndex - 1 + total) % total;
  }

  let currentRowIdx = rows.findIndex((r) => r.includes(currentIndex));
  if (currentRowIdx === -1) currentRowIdx = 0;

  const currentRow = rows[currentRowIdx];
  const currentCol = currentRow.indexOf(currentIndex);

  if (direction === 'down') {
    const nextRowIdx = (currentRowIdx + 1) % rows.length;
    const nextRow = rows[nextRowIdx];
    const targetCol = Math.min(Math.max(0, currentCol), nextRow.length - 1);
    return nextRow[targetCol];
  }

  if (direction === 'up') {
    const prevRowIdx = (currentRowIdx - 1 + rows.length) % rows.length;
    const prevRow = rows[prevRowIdx];
    const targetCol = Math.min(Math.max(0, currentCol), prevRow.length - 1);
    return prevRow[targetCol];
  }

  return currentIndex;
}

export function buildWordDetailMarkdown(
  wordResult: WordResult,
  allSynonyms: string[] = [],
  allAntonyms: string[] = [],
  selectedWord?: string,
  vectorSynonyms: string[] = []
): string {
  const { word, phonetic, meanings, source, syllables, originalSource } = wordResult;

  const isOffline = (originalSource || source) === 'offline';
  let md = '';

  // Title sits directly at the top with zero empty space
  md += `# ${word.toUpperCase()}\n\n`;

  // Parts of speech list and clickable audio pronunciation
  const posList = Array.from(new Set(meanings.map((m) => m.partOfSpeech)));
  const typeStr = posList.join(', ');
  const phoneticLink = phonetic ? `[${phonetic} 🔊](${getSpeakLink(word)})` : '';
  let subheader = phoneticLink ? `${typeStr} ⋅ ${phoneticLink}` : typeStr;
  if (syllables) {
    subheader += ` (${syllables} ${syllables === 1 ? 'syllable' : 'syllables'})`;
  }
  if (isOffline) {
    subheader += ` ⋅ offline`;
  }

  md += `*${subheader}*\n\n---\n\n`;

  // Definitions
  if (meanings.length === 1) {
    const meaning = meanings[0];
    meaning.definitions.forEach((def, idx) => {
      md += `${idx + 1}. ${def}\n`;
      const example =
        meaning.examples[idx] ||
        (idx === 0 && meaning.examples.length > 0 ? meaning.examples[0] : null);
      if (example) {
        md += `   > _"${example}"_\n`;
      }
      md += '\n';
    });
  } else {
    meanings.forEach((meaning) => {
      md += `### ${meaning.partOfSpeech.toUpperCase()}\n\n`;
      meaning.definitions.forEach((def, idx) => {
        md += `${idx + 1}. ${def}\n`;
        const example =
          meaning.examples[idx] ||
          (idx === 0 && meaning.examples.length > 0 ? meaning.examples[0] : null);
        if (example) {
          md += `   > _"${example}"_\n`;
        }
        md += '\n';
      });
    });
  }

  // Clickable Synonyms (top 3 vector synonyms in green + standard synonyms)
  const lowerAll = new Set(allSynonyms.map((s) => s.toLowerCase()));
  const top3Vector = vectorSynonyms
    .filter((v) => v.toLowerCase() !== word.toLowerCase() && !lowerAll.has(v.toLowerCase()))
    .slice(0, 3);
  const combinedSynonyms = [...top3Vector, ...allSynonyms];
  const vectorWords = new Set(top3Vector.map((v) => v.toLowerCase()));

  if (combinedSynonyms.length > 0) {
    md += `---\n\n### SYNONYMS (${combinedSynonyms.length})\n\n`;
    md += formatBadgeSection(combinedSynonyms, selectedWord, getDefLink, 5, vectorWords);
  }

  // Clickable Antonyms (rounded boxes, white text, lighter when selected)
  if (allAntonyms.length > 0) {
    md += `### ANTONYMS (${allAntonyms.length})\n\n`;
    md += formatBadgeSection(allAntonyms, selectedWord, getDefLink, 5);
  }

  return md;
}

export function buildSynonymsDetailMarkdown(
  targetWord: string,
  directSynonyms: SynonymItem[],
  relatedWords: SynonymItem[],
  antonyms: SynonymItem[],
  source?: string,
  selectedWord?: string
): string {
  let md = '';

  // Title sits directly at the top with zero empty space
  md += `# ${targetWord.toUpperCase()}\n\n`;
  md += source === 'offline' ? `*Thesaurus ⋅ offline*\n\n---\n\n` : `*Thesaurus*\n\n---\n\n`;

  if (directSynonyms.length > 0) {
    md += `### DIRECT SYNONYMS (${directSynonyms.length})\n\n`;
    md += formatBadgeSection(
      directSynonyms.map((s) => s.word),
      selectedWord,
      getDefLink,
      5
    );
  }

  if (relatedWords.length > 0) {
    md += `### RELATED MEANINGS & NUANCES (${relatedWords.length})\n\n`;
    md += formatBadgeSection(
      relatedWords.map((r) => r.word),
      selectedWord,
      getDefLink,
      5
    );
  }

  if (antonyms.length > 0) {
    md += `### ANTONYMS (${antonyms.length})\n\n`;
    md += formatBadgeSection(
      antonyms.map((a) => a.word),
      selectedWord,
      getDefLink,
      5
    );
  }

  return md;
}
