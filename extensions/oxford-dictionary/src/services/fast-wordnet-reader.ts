import fs from 'fs';
import path from 'path';
import { WordResult, MeaningGroup, PartOfSpeech, SynonymItem } from '../types/dictionary';

let environmentAssetsPath: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { environment } = require('@raycast/api');
  environmentAssetsPath = environment?.assetsPath;
} catch {
  // Standalone test environment
}

const POS_CONFIG: Array<{ pos: PartOfSpeech; indexFile: string; dataFile: string; headerEnd: number }> = [
  { pos: 'noun', indexFile: 'index.noun', dataFile: 'data.noun', headerEnd: 6297 },
  { pos: 'verb', indexFile: 'index.verb', dataFile: 'data.verb', headerEnd: 1740 },
  { pos: 'adjective', indexFile: 'index.adj', dataFile: 'data.adj', headerEnd: 8177 },
  { pos: 'adverb', indexFile: 'index.adv', dataFile: 'data.adv', headerEnd: 1802 },
];

let cachedDbDir: string | null = null;

export function getWordNetDbDir(): string | null {
  if (cachedDbDir && fs.existsSync(path.join(cachedDbDir, 'index.noun'))) {
    return cachedDbDir;
  }

  const candidates = [
    environmentAssetsPath ? path.join(environmentAssetsPath, 'wordnet-db') : '',
    path.join(__dirname, 'assets/wordnet-db'),
    path.join(__dirname, '../assets/wordnet-db'),
    path.join(__dirname, 'node_modules/db'),
    path.join(__dirname, '../node_modules/db'),
    path.join(__dirname, 'node_modules/wordnet/db'),
    path.join(__dirname, '../node_modules/wordnet/db'),
    path.join(process.cwd(), 'assets/wordnet-db'),
    path.join(process.cwd(), 'node_modules/wordnet/db'),
    path.join(process.cwd(), 'dist/node_modules/db'),
  ];

  for (const c of candidates) {
    try {
      if (c && fs.existsSync(c) && fs.existsSync(path.join(c, 'index.noun'))) {
        cachedDbDir = c;
        return c;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Performs a binary search on a sorted WordNet index file using disk seeks.
 * Memory overhead: ~1 KB buffer.
 */
function binarySearchWord(filePath: string, targetWord: string, headerEnd: number): string | null {
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return null;
  }

  try {
    const stat = fs.fstatSync(fd);
    let low = headerEnd;
    let high = stat.size - 1;
    const buf = Buffer.alloc(1024);
    let result: string | null = null;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const bytesRead = fs.readSync(fd, buf, 0, 1024, mid);
      if (bytesRead <= 0) break;

      const text = buf.toString('latin1', 0, bytesRead);
      const nl = text.indexOf('\n');
      if (nl === -1) break;

      const nextNl = text.indexOf('\n', nl + 1);
      if (nextNl === -1) break;

      const line = text.slice(nl + 1, nextNl).trim();
      if (!line) {
        low = mid + 1;
        continue;
      }

      const sp = line.indexOf(' ');
      if (sp === -1) break;

      const lemma = line.slice(0, sp).toLowerCase();
      if (lemma === targetWord) {
        result = line;
        break;
      }

      if (lemma < targetWord) {
        low = mid + nl + 1;
      } else {
        high = mid - 1;
      }
    }

    return result;
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      // ignore
    }
  }
}

/**
 * Reads a single synset definition from data file at the specified byte offset.
 */
function readSynsetAtOffset(
  dataPath: string,
  offset: number
): { definition: string; examples: string[]; words: string[] } | null {
  let fd: number;
  try {
    fd = fs.openSync(dataPath, 'r');
  } catch {
    return null;
  }

  try {
    const buf = Buffer.alloc(2048);
    const bytesRead = fs.readSync(fd, buf, 0, 2048, offset);
    if (bytesRead === 0) return null;

    const text = buf.toString('latin1', 0, bytesRead);
    const lineEnd = text.indexOf('\n');
    const line = lineEnd !== -1 ? text.slice(0, lineEnd).trim() : text.trim();

    const pipeIdx = line.indexOf('|');
    if (pipeIdx === -1) return null;

    const header = line.slice(0, pipeIdx).trim();
    const gloss = line.slice(pipeIdx + 1).trim();

    // Parse words in synset
    const headerTokens = header.split(/\s+/);
    const words: string[] = [];
    if (headerTokens.length >= 4) {
      const wCountHex = headerTokens[3];
      const wCount = parseInt(wCountHex, 16);
      if (!isNaN(wCount)) {
        for (let i = 0; i < wCount; i++) {
          const wIdx = 4 + i * 2;
          if (wIdx < headerTokens.length) {
            words.push(headerTokens[wIdx].replace(/_/g, ' ').toLowerCase());
          }
        }
      }
    }

    // Parse gloss into definition and examples
    const parts = gloss.split(';');
    const examples: string[] = [];
    const defParts: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        examples.push(trimmed.slice(1, -1));
      } else {
        defParts.push(trimmed);
      }
    }

    const definition = defParts.join('; ').replace(/^"|"$/g, '').trim() || gloss;

    return { definition, examples, words };
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      // ignore
    }
  }
}

/**
 * Ultra-fast zero-heap-overhead offline WordNet lookup.
 * Performs direct disk binary searches. Memory overhead: < 50 KB!
 */
export async function lookupOfflineZeroRam(word: string): Promise<WordResult | null> {
  const cleanWord = word.trim().toLowerCase().replace(/\s+/g, '_');
  if (!cleanWord) return null;

  const dbDir = getWordNetDbDir();
  if (!dbDir) return null;

  const meanings: MeaningGroup[] = [];
  const allSynonymsSet = new Set<string>();

  for (const cfg of POS_CONFIG) {
    const indexPath = path.join(dbDir, cfg.indexFile);
    const dataPath = path.join(dbDir, cfg.dataFile);

    // Look up word in index
    let indexLine = binarySearchWord(indexPath, cleanWord, cfg.headerEnd);

    // If not found and ends with 's', try singular
    if (!indexLine && cleanWord.endsWith('s') && cleanWord.length > 3) {
      indexLine = binarySearchWord(indexPath, cleanWord.slice(0, -1), cfg.headerEnd);
    }

    if (!indexLine) continue;

    // Parse offsets from index line
    const tokens = indexLine.split(/\s+/);
    if (tokens.length < 5) continue;

    const synsetCount = parseInt(tokens[2], 10);
    const pointerCount = parseInt(tokens[3], 10);

    const offsetsStartIdx = 4 + pointerCount + 2;
    const offsets: number[] = [];

    for (let i = offsetsStartIdx; i < tokens.length; i++) {
      const off = parseInt(tokens[i], 10);
      if (!isNaN(off) && off > 0) {
        offsets.push(off);
      }
      if (offsets.length >= synsetCount) break;
    }

    const definitions: string[] = [];
    const examples: string[] = [];
    const posSynonyms: string[] = [];

    for (const off of offsets.slice(0, 6)) {
      const synset = readSynsetAtOffset(dataPath, off);
      if (synset) {
        if (!definitions.includes(synset.definition)) {
          definitions.push(synset.definition);
        }
        for (const ex of synset.examples) {
          if (!examples.includes(ex)) examples.push(ex);
        }
        for (const w of synset.words) {
          if (w !== cleanWord && !posSynonyms.includes(w)) {
            posSynonyms.push(w);
            allSynonymsSet.add(w);
          }
        }
      }
    }

    if (definitions.length > 0) {
      meanings.push({
        partOfSpeech: cfg.pos,
        definitions,
        examples,
        synonyms: posSynonyms,
        antonyms: [],
      });
    }
  }

  if (meanings.length === 0) return null;

  return {
    word: cleanWord.replace(/_/g, ' '),
    meanings,
    allSynonyms: Array.from(allSynonymsSet),
    allAntonyms: [],
    source: 'offline',
  };
}

export function getOfflineSynonymsZeroRam(word: string): SynonymItem[] {
  const cleanWord = word.trim().toLowerCase().replace(/\s+/g, '_');
  if (!cleanWord) return [];

  const dbDir = getWordNetDbDir();
  if (!dbDir) return [];

  const results: SynonymItem[] = [];
  const seen = new Set<string>();

  for (const cfg of POS_CONFIG) {
    const indexPath = path.join(dbDir, cfg.indexFile);
    const dataPath = path.join(dbDir, cfg.dataFile);

    let indexLine = binarySearchWord(indexPath, cleanWord, cfg.headerEnd);
    if (!indexLine && cleanWord.endsWith('s') && cleanWord.length > 3) {
      indexLine = binarySearchWord(indexPath, cleanWord.slice(0, -1), cfg.headerEnd);
    }
    if (!indexLine) continue;

    const tokens = indexLine.split(/\s+/);
    const pointerCount = parseInt(tokens[3] || '0', 10);
    const offsetsStartIdx = 4 + pointerCount + 2;

    for (let i = offsetsStartIdx; i < tokens.length; i++) {
      const off = parseInt(tokens[i], 10);
      if (isNaN(off)) continue;

      const synset = readSynsetAtOffset(dataPath, off);
      if (synset) {
        for (const w of synset.words) {
          if (w !== cleanWord && !seen.has(w)) {
            seen.add(w);
            results.push({
              word: w,
              partOfSpeech: cfg.pos,
              relationType: 'synonym',
            });
          }
        }
      }
    }
  }

  return results;
}

export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[a.length][b.length];
}

function findCandidatesInFile(
  filePath: string,
  prefix: string,
  headerEnd: number,
  maxResults = 50
): string[] {
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return [];
  }

  try {
    const stat = fs.fstatSync(fd);
    let low = headerEnd;
    let high = stat.size - 1;
    let startOffset = -1;
    const buf = Buffer.alloc(1024);

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const bytesRead = fs.readSync(fd, buf, 0, 1024, mid);
      if (bytesRead <= 0) break;

      const text = buf.toString('latin1', 0, bytesRead);
      const nl = text.indexOf('\n');
      if (nl === -1) break;

      const nextNl = text.indexOf('\n', nl + 1);
      if (nextNl === -1) break;

      const line = text.slice(nl + 1, nextNl).trim();
      const sp = line.indexOf(' ');
      if (sp === -1) break;

      const lemma = line.slice(0, sp).toLowerCase();
      if (lemma >= prefix) {
        startOffset = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    if (startOffset === -1) return [];

    const readBuf = Buffer.alloc(8192);
    let currentPos = Math.max(headerEnd, startOffset - 2048);
    let leftover = '';
    const results: string[] = [];

    while (currentPos < stat.size && results.length < maxResults) {
      const bytesRead = fs.readSync(fd, readBuf, 0, 8192, currentPos);
      if (bytesRead <= 0) break;
      currentPos += bytesRead;

      const chunk = leftover + readBuf.toString('latin1', 0, bytesRead);
      const lines = chunk.split('\n');
      leftover = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('  ')) continue;
        const sp = trimmed.indexOf(' ');
        if (sp === -1) continue;

        const lemma = trimmed.slice(0, sp).toLowerCase();
        if (lemma.startsWith(prefix)) {
          if (!results.includes(lemma)) {
            results.push(lemma);
            if (results.length >= maxResults) break;
          }
        } else if (lemma > prefix) {
          return results;
        }
      }
    }

    return results;
  } finally {
    fs.closeSync(fd);
  }
}

export function findPrefixMatchesOffline(prefix: string, maxResults = 10): string[] {
  const cleanPrefix = prefix.trim().toLowerCase().replace(/\s+/g, '_');
  if (cleanPrefix.length < 2) return [];

  const dbDir = getWordNetDbDir();
  if (!dbDir) return [];

  const results: string[] = [];
  const seen = new Set<string>();

  for (const cfg of POS_CONFIG) {
    const indexPath = path.join(dbDir, cfg.indexFile);
    const matches = findCandidatesInFile(indexPath, cleanPrefix, cfg.headerEnd, maxResults);
    for (const m of matches) {
      const word = m.replace(/_/g, ' ');
      if (!seen.has(word)) {
        seen.add(word);
        results.push(word);
        if (results.length >= maxResults) return results;
      }
    }
  }

  return results;
}

export function spellCheckOffline(misspelled: string, maxResults = 5): string[] {
  const query = misspelled.trim().toLowerCase().replace(/\s+/g, '_');
  if (query.length < 2) return [];

  const dbDir = getWordNetDbDir();
  if (!dbDir) return [];

  const candidatePrefixes = new Set<string>();
  candidatePrefixes.add(query.slice(0, Math.min(4, query.length)));
  candidatePrefixes.add(query.slice(0, Math.min(3, query.length)));

  if (query.length >= 3) {
    const chars = query.split('');
    const s01 = [chars[1], chars[0], ...chars.slice(2)].join('').slice(0, 3);
    candidatePrefixes.add(s01);
    const s12 = [chars[0], chars[2], chars[1], ...chars.slice(3)].join('').slice(0, 3);
    candidatePrefixes.add(s12);
  }

  const candidateWords = new Set<string>();
  for (const prefix of candidatePrefixes) {
    for (const cfg of POS_CONFIG) {
      const indexPath = path.join(dbDir, cfg.indexFile);
      const found = findCandidatesInFile(indexPath, prefix, cfg.headerEnd, 40);
      found.forEach((w) => candidateWords.add(w));
    }
  }

  const maxDist = query.length > 7 ? 2 : 1;
  const scored: Array<{ word: string; dist: number }> = [];

  for (const word of candidateWords) {
    if (word.includes('_') && !query.includes('_') && !query.includes(' ')) continue;
    const dist = damerauLevenshtein(query, word);
    if (dist <= maxDist && dist > 0) {
      scored.push({ word: word.replace(/_/g, ' '), dist });
    }
  }

  scored.sort((a, b) => a.dist - b.dist || a.word.length - b.word.length);
  return scored.slice(0, maxResults).map((s) => s.word);
}

