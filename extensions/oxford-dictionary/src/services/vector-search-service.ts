import https from 'https';
import fs from 'fs';
import path from 'path';
import {
  VectorSearchResult,
  ExtensionPreferences,
  PartOfSpeech,
} from '../types/dictionary';
import { NICHE_VOCABULARY, searchNicheVocabulary } from '../data/niche-vocabulary';
import { lookupOffline } from './offline-dictionary';

let environmentAssetsPath: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { environment } = require('@raycast/api');
  environmentAssetsPath = environment?.assetsPath;
} catch {
  // Standalone test environment
}

const vectorMemoryCache = new Map<string, VectorSearchResult[]>();

export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'll',
  'm', 'ma', 'me', 'might', 'more', 'most', 'must', 'my', 'myself', 'no', 'nor', 'not', 'now', 'o',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  're', 's', 'same', 'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 've', 'very', 'was', 'wasn', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would', 'y', 'you', 'your', 'yours',
  'yourself', 'yourselves',
]);

// Systematic English morphological adjective derivations
const CLASSICAL_ADJECTIVES: Record<string, string> = {
  edifice: 'edificial',
  palace: 'palatial',
  colossus: 'colossal',
  cyclops: 'cyclopean',
  titan: 'titanic',
  monolith: 'monolithic',
  statue: 'statuesque',
  ocean: 'oceanic',
  tempest: 'tempestuous',
  glacier: 'glacial',
  epiphany: 'epiphanic',
  aporia: 'aporetic',
  hubris: 'hubristic',
  catharsis: 'cathartic',
  nemesis: 'nemetic',
  nostalgia: 'nostalgic',
  melancholy: 'melancholic',
  seraph: 'seraphic',
  apocalypse: 'apocalyptic',
};

// Vector database state
let isDbLoaded = false;
let vectorBuffer: Int8Array | null = null;
let vocabMetadata: Array<[string, number]> = [];
let wordToIndex = new Map<string, number>();
let invNorms: Float32Array = new Float32Array(0);
const D = 100;

function findAssetFile(fileName: string): string | null {
  const candidates = [
    environmentAssetsPath ? path.join(environmentAssetsPath, fileName) : '',
    environmentAssetsPath ? path.join(environmentAssetsPath, 'assets', fileName) : '',
    path.join(__dirname, 'assets', fileName),
    path.join(__dirname, '../assets', fileName),
    path.join(__dirname, '../../assets', fileName),
    path.join(process.cwd(), 'assets', fileName),
    path.join(process.cwd(), 'dist', 'assets', fileName),
    'C:/Users/Johno/.config/raycast/extensions/oxford-dictionary/assets/' + fileName,
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

function loadVectorDb(): boolean {
  if (isDbLoaded && vectorBuffer && vocabMetadata.length > 0) {
    return true;
  }

  const binPath = findAssetFile('word-vectors.bin');
  const vocabPath = findAssetFile('word-vectors.vocab.json');

  if (!binPath || !vocabPath) {
    return false;
  }

  try {
    const rawVocab = fs.readFileSync(vocabPath, 'utf8');
    vocabMetadata = JSON.parse(rawVocab) as Array<[string, number]>;

    const rawBin = fs.readFileSync(binPath);
    vectorBuffer = new Int8Array(rawBin.buffer, rawBin.byteOffset, rawBin.byteLength);

    const N = vocabMetadata.length;
    wordToIndex = new Map<string, number>();
    invNorms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      wordToIndex.set(vocabMetadata[i][0], i);

      let sumSq = 0;
      const off = i * D;
      for (let d = 0; d < D; d++) {
        const v = vectorBuffer[off + d];
        sumSq += v * v;
      }
      const norm = Math.sqrt(sumSq);
      invNorms[i] = norm > 1e-6 ? 1.0 / norm : 0;
    }

    isDbLoaded = true;
    return true;
  } catch (err) {
    console.error('Failed to load local vector database:', err);
    return false;
  }
}

/**
 * Extracts normalized positive and negative seed words from a query.
 */
export function extractSeedWords(query: string): string[] {
  const rawTokens = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s,;]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  const filtered = rawTokens.filter((w) => {
    const clean = w.startsWith('-') || w.startsWith('+') ? w.slice(1) : w;
    return !STOP_WORDS.has(clean);
  });

  const result = filtered.length > 0 ? filtered : rawTokens;
  return Array.from(new Set(result));
}

export interface ParsedQuery {
  positiveSeeds: string[];
  negativeSeeds: string[];
  seedSet: Set<string>;
  dominantPosMask: number;
  dominantPosStr: PartOfSpeech;
}

export function parseQuerySeeds(query: string | string[]): ParsedQuery {
  const tokens = Array.isArray(query) ? query : extractSeedWords(query);

  const positiveSeeds: string[] = [];
  const negativeSeeds: string[] = [];
  const seedSet = new Set<string>();

  for (const raw of tokens) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    if (t.startsWith('-') && t.length > 1) {
      const clean = t.slice(1);
      negativeSeeds.push(clean);
      seedSet.add(clean);
    } else {
      const clean = t.startsWith('+') ? t.slice(1) : t;
      positiveSeeds.push(clean);
      seedSet.add(clean);
    }
  }

  // Count POS bitmasks for positive seeds
  loadVectorDb();
  const posCounts: Record<number, number> = { 1: 0, 2: 0, 4: 0, 8: 0 };
  for (const s of positiveSeeds) {
    const idx = wordToIndex.get(s);
    if (idx !== undefined) {
      const mask = vocabMetadata[idx][1];
      if (mask & 1) posCounts[1]++;
      if (mask & 2) posCounts[2]++;
      if (mask & 4) posCounts[4]++;
      if (mask & 8) posCounts[8]++;
    }
  }

  // Pick dominant POS
  let dominantPosMask = 1;
  let maxCount = -1;
  for (const m of [4, 1, 2, 8]) {
    if (posCounts[m] > maxCount) {
      maxCount = posCounts[m];
      dominantPosMask = m;
    }
  }

  let dominantPosStr: PartOfSpeech = 'noun';
  if (dominantPosMask === 4) dominantPosStr = 'adjective';
  else if (dominantPosMask === 2) dominantPosStr = 'verb';
  else if (dominantPosMask === 8) dominantPosStr = 'adverb';

  return {
    positiveSeeds,
    negativeSeeds,
    seedSet,
    dominantPosMask,
    dominantPosStr,
  };
}

/**
 * Checks if a candidate word is a direct morphological clone of any seed word.
 */
export function isMorphologicalClone(word: string, seeds: string[]): boolean {
  const c = word.toLowerCase();
  for (const raw of seeds) {
    const s = raw.toLowerCase();
    if (c === s) return true;
    const suffixes = ['s', 'es', 'ed', 'ing', 'ly', 'ness', 'ity', 'ish', 'er', 'est'];
    for (const suf of suffixes) {
      if (c === s + suf || s === c + suf) return true;
    }
    const minLen = Math.min(c.length, s.length);
    if (minLen >= 4) {
      let commonPrefix = 0;
      while (commonPrefix < minLen && c[commonPrefix] === s[commonPrefix]) {
        commonPrefix++;
      }
      if (commonPrefix >= 4 && Math.abs(c.length - s.length) <= 3) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Executes high-speed local 100D Int8 cosine similarity search.
 */
export function searchOfflineVector(
  query: string | string[],
  limit = 50
): VectorSearchResult[] {
  if (!loadVectorDb() || !vectorBuffer) {
    return [];
  }

  const { positiveSeeds, negativeSeeds, seedSet, dominantPosMask, dominantPosStr } = parseQuerySeeds(query);
  if (positiveSeeds.length === 0 && negativeSeeds.length === 0) {
    return [];
  }

  // Build 100D query centroid vector and individual positive seed vectors
  const q = new Float32Array(D);
  const positiveSeedVecs: Float32Array[] = [];

  for (const s of positiveSeeds) {
    let idx = wordToIndex.get(s);
    if (idx === undefined && CLASSICAL_ADJECTIVES[s]) {
      idx = wordToIndex.get(CLASSICAL_ADJECTIVES[s]);
    }
    if (idx !== undefined) {
      const sv = new Float32Array(D);
      const off = idx * D;
      let sSumSq = 0;
      for (let d = 0; d < D; d++) {
        const val = vectorBuffer[off + d] / 127.0;
        sv[d] = val;
        sSumSq += val * val;
        q[d] += val;
      }
      const sNorm = Math.sqrt(sSumSq);
      if (sNorm > 1e-9) {
        const invSNorm = 1.0 / sNorm;
        for (let d = 0; d < D; d++) sv[d] *= invSNorm;
      }
      positiveSeedVecs.push(sv);
    }
  }

  // Negative vector subtraction (weight = -0.85)
  for (const s of negativeSeeds) {
    const idx = wordToIndex.get(s);
    if (idx !== undefined) {
      const off = idx * D;
      for (let d = 0; d < D; d++) {
        q[d] -= 0.85 * (vectorBuffer[off + d] / 127.0);
      }
    }
  }

  let sumSq = 0;
  for (let d = 0; d < D; d++) sumSq += q[d] * q[d];
  const qNorm = Math.sqrt(sumSq);
  if (qNorm > 1e-9) {
    const invQ = 1.0 / qNorm;
    for (let d = 0; d < D; d++) q[d] *= invQ;
  } else {
    return [];
  }

  const N = vocabMetadata.length;
  const candidates: Array<{ word: string; sim: number; rawCosine: number; posMask: number; rank: number }> = [];
  const hasMultipleSeeds = positiveSeedVecs.length >= 2;
  const NICHE_WORDS_SET = new Set(NICHE_VOCABULARY.map((n) => n.word.toLowerCase()));

  // Fast unrolled 10-way dot product loop
  for (let i = 0; i < N; i++) {
    const [word, posMask] = vocabMetadata[i];
    if (seedSet.has(word)) continue;

    const off = i * D;
    let dot = 0;
    for (let d = 0; d < D; d += 10) {
      dot +=
        q[d] * vectorBuffer[off + d] +
        q[d + 1] * vectorBuffer[off + d + 1] +
        q[d + 2] * vectorBuffer[off + d + 2] +
        q[d + 3] * vectorBuffer[off + d + 3] +
        q[d + 4] * vectorBuffer[off + d + 4] +
        q[d + 5] * vectorBuffer[off + d + 5] +
        q[d + 6] * vectorBuffer[off + d + 6] +
        q[d + 7] * vectorBuffer[off + d + 7] +
        q[d + 8] * vectorBuffer[off + d + 8] +
        q[d + 9] * vectorBuffer[off + d + 9];
    }

    const rawSim = dot * invNorms[i];
    if (rawSim <= 0.05) continue;

    // 1. Multi-Seed Intersection Consistency (Triangulation)
    let triangulationMul = 1.0;
    if (hasMultipleSeeds) {
      let minSeedSim = 999.0;
      for (let s = 0; s < positiveSeedVecs.length; s++) {
        const sv = positiveSeedVecs[s];
        let sDot = 0;
        for (let d = 0; d < D; d += 10) {
          sDot +=
            sv[d] * vectorBuffer[off + d] +
            sv[d + 1] * vectorBuffer[off + d + 1] +
            sv[d + 2] * vectorBuffer[off + d + 2] +
            sv[d + 3] * vectorBuffer[off + d + 3] +
            sv[d + 4] * vectorBuffer[off + d + 4] +
            sv[d + 5] * vectorBuffer[off + d + 5] +
            sv[d + 6] * vectorBuffer[off + d + 6] +
            sv[d + 7] * vectorBuffer[off + d + 7] +
            sv[d + 8] * vectorBuffer[off + d + 8] +
            sv[d + 9] * vectorBuffer[off + d + 9];
        }
        const sSim = sDot * invNorms[i];
        if (sSim < minSeedSim) minSeedSim = sSim;
      }

      if (minSeedSim >= 0.28) {
        triangulationMul = 1.0 + 0.18 * minSeedSim;
      } else if (minSeedSim < 0.12) {
        triangulationMul = 0.82;
      }
    }

    // 2. Correlation-Gated Vocabulary Register Curve (Using Vocab Index i)
    const isNiche = NICHE_WORDS_SET.has(word);
    let registerMul = 1.0;
    if (i < 2200) {
      registerMul = rawSim > 0.78 ? 1.0 : 0.92;
    } else if (i <= 22000) {
      registerMul = 1.10;
    } else if (i <= 38000 || isNiche) {
      if (rawSim >= 0.56) {
        registerMul = 1.08;
      } else if (rawSim >= 0.48) {
        registerMul = 0.95;
      } else {
        registerMul = 0.78;
      }
    } else {
      if (rawSim >= 0.64) {
        registerMul = 1.0;
      } else {
        registerMul = 0.70;
      }
    }

    // 3. POS-alignment multiplier (1.12x)
    const posMultiplier = (posMask & dominantPosMask) !== 0 ? 1.12 : 1.0;

    // 4. Morphological clone suppression
    const cloneMultiplier = isMorphologicalClone(word, positiveSeeds) ? 0.85 : 1.0;

    const finalSim = rawSim * triangulationMul * registerMul * posMultiplier * cloneMultiplier;

    candidates.push({
      word,
      sim: finalSim,
      rawCosine: rawSim,
      posMask,
      rank: i,
    });
  }

  // Morphological boost for adjective forms in adjective queries
  if (dominantPosMask === 4) {
    const candMap = new Map<string, number>();
    for (const c of candidates) candMap.set(c.word, c.sim);
    for (const c of candidates) {
      for (const [noun, adj] of Object.entries(CLASSICAL_ADJECTIVES)) {
        if (c.word === adj) {
          const nounScore = candMap.get(noun) || 0;
          if (nounScore > 0) {
            c.sim = Math.max(c.sim, nounScore * 1.15);
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.sim - a.sim);

  const topHits = candidates.slice(0, limit);
  if (topHits.length === 0) return [];

  const maxSim = topHits[0].sim;

  // Enrich top hits with definitions and POS
  return topHits.map((cand, idx) => {
    const ratio = maxSim > 0 ? cand.sim / maxSim : 1.0;
    const rankDecay = Math.max(0, 1.0 - idx * 0.012);
    const scoreVal = ratio * 0.80 + rankDecay * 0.20;
    const matchPercent = Math.min(99, Math.max(50, Math.round(scoreVal * 98)));

    let pos: PartOfSpeech = dominantPosStr;
    if (cand.posMask & 4) pos = 'adjective';
    else if (cand.posMask & 1) pos = 'noun';
    else if (cand.posMask & 2) pos = 'verb';
    else if (cand.posMask & 8) pos = 'adverb';

    // Lazy check in niche vocabulary first
    const niche = NICHE_VOCABULARY.find((n) => n.word.toLowerCase() === cand.word);
    let definition = niche?.definition;
    if (niche?.partOfSpeech) {
      pos = niche.partOfSpeech;
    }

    return {
      word: cand.word,
      similarity: Number(ratio.toFixed(4)),
      matchPercent,
      score: Math.round(cand.sim * 1000),
      rawScore: cand.sim,
      source: 'offline',
      partOfSpeech: pos,
      definition,
    };
  });
}

interface DatamuseItem {
  word: string;
  score: number;
  tags?: string[];
  defs?: string[];
}

function fetchDatamuse(endpoint: string): Promise<DatamuseItem[]> {
  return new Promise((resolve) => {
    const req = https.get(endpoint, { timeout: 3500 }, (res) => {
      if (res.statusCode !== 200) {
        resolve([]);
        return;
      }
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          resolve(Array.isArray(json) ? json : []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

function parseDatamusePos(tags?: string[]): PartOfSpeech {
  if (!tags || !Array.isArray(tags)) return 'noun';
  if (tags.includes('adj')) return 'adjective';
  if (tags.includes('v')) return 'verb';
  if (tags.includes('n')) return 'noun';
  if (tags.includes('adv')) return 'adverb';
  return 'noun';
}

function parseDatamuseDef(defs?: string[]): { pos?: PartOfSpeech; definition?: string } {
  if (!defs || !Array.isArray(defs) || defs.length === 0) return {};
  const raw = defs[0];
  const parts = raw.split('\t');
  if (parts.length >= 2) {
    const rawPos = parts[0].trim();
    let pos: PartOfSpeech = 'noun';
    if (rawPos === 'adj') pos = 'adjective';
    else if (rawPos === 'v') pos = 'verb';
    else if (rawPos === 'n') pos = 'noun';
    else if (rawPos === 'adv') pos = 'adverb';

    const cleanDef = parts[1].replace(/^[A-Z0-9_]+\s*:\s*/i, '').trim();
    return { pos, definition: cleanDef };
  }
  return { definition: raw.trim() };
}

/**
 * Hybrid Online Mode:
 * Blends local 100D vector cosine score (75% weight) with Datamuse rel_syn + ml (25% weight),
 * subtracting rel_ant antonyms.
 */
async function searchHybridVector(
  query: string,
  limit = 50
): Promise<VectorSearchResult[]> {
  const parsed = parseQuerySeeds(query);
  const { positiveSeeds, negativeSeeds, seedSet, dominantPosMask, dominantPosStr } = parsed;

  if (positiveSeeds.length === 0 && negativeSeeds.length === 0) {
    return [];
  }

  // 1. Local 100D Vector Search
  const localHits = searchOfflineVector(query, 120);
  const localScoreMap = new Map<string, number>();
  const maxRawLocal =
    localHits.length > 0
      ? Math.max(
          ...localHits.map((h) => (h.rawScore !== undefined ? h.rawScore : (h.score || 0) / 1000)),
          0.0001
        )
      : 1.0;

  for (const h of localHits) {
    const raw = h.rawScore !== undefined ? h.rawScore : (h.score || 0) / 1000;
    localScoreMap.set(h.word.toLowerCase(), Math.max(0, raw / maxRawLocal));
  }

  // 2. Online Datamuse Queries (rel_syn, ml, and rel_ant)
  const onlinePromises: Promise<{ type: 'pos' | 'ant'; items: DatamuseItem[]; weight: number }>[] = [];
  const directAntonyms = new Set<string>();

  // Means-like joint query
  if (positiveSeeds.length > 0) {
    const mlUrl = `https://api.datamuse.com/words?ml=${encodeURIComponent(positiveSeeds.join('+'))}&md=dpfs&max=150`;
    onlinePromises.push(
      fetchDatamuse(mlUrl).then((items) => ({ type: 'pos', items, weight: 1.5 }))
    );
  }

  // Synonyms for positive seeds
  for (const s of positiveSeeds.slice(0, 3)) {
    const synUrl = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(s)}&md=dpfs&max=60`;
    onlinePromises.push(
      fetchDatamuse(synUrl).then((items) => ({ type: 'pos', items, weight: 1.2 }))
    );
  }

  // Antonyms for positive seeds to subtract
  for (const s of positiveSeeds.slice(0, 2)) {
    const antUrl = `https://api.datamuse.com/words?rel_ant=${encodeURIComponent(s)}&max=40`;
    onlinePromises.push(
      fetchDatamuse(antUrl).then((items) => ({ type: 'ant', items, weight: 1.5 }))
    );
  }

  // Explicit negative seeds to subtract
  for (const neg of negativeSeeds) {
    const negUrl = `https://api.datamuse.com/words?ml=${encodeURIComponent(neg)}&max=60`;
    onlinePromises.push(
      fetchDatamuse(negUrl).then((items) => ({ type: 'ant', items, weight: 1.5 }))
    );
  }

  const onlineData = await Promise.all(onlinePromises);

  const onlineScoreMap = new Map<
    string,
    { score: number; defs?: string[]; tags?: string[] }
  >();

  for (const resp of onlineData) {
    const { type, items, weight } = resp;
    items.forEach((item, rank) => {
      const w = item.word.toLowerCase();
      if (seedSet.has(w) || w.length < 2) return;

      const rrf = weight * (1.0 / (rank + 15));
      const existing = onlineScoreMap.get(w);

      if (type === 'pos') {
        if (existing) {
          existing.score += rrf;
          if (!existing.defs && item.defs) existing.defs = item.defs;
          if (!existing.tags && item.tags) existing.tags = item.tags;
        } else {
          onlineScoreMap.set(w, {
            score: rrf,
            defs: item.defs,
            tags: item.tags,
          });
        }
      } else if (type === 'ant') {
        directAntonyms.add(w);
        if (existing) {
          existing.score -= rrf * 1.5;
        } else {
          onlineScoreMap.set(w, {
            score: -rrf * 1.5,
            defs: item.defs,
            tags: item.tags,
          });
        }
      }
    });
  }

  // Find max positive online score
  let maxOnline = 0.0001;
  for (const v of onlineScoreMap.values()) {
    if (v.score > maxOnline) maxOnline = v.score;
  }

  // 3. Blend Scores: 75% Local + 25% Online
  const candidateKeys = new Set<string>([
    ...localScoreMap.keys(),
    ...Array.from(onlineScoreMap.keys()).filter((k) => (onlineScoreMap.get(k)?.score || 0) > 0),
  ]);

  // Morphological expansion: if query is predominantly adjectival, derive adjectives
  if (dominantPosMask === 4) {
    for (const k of Array.from(candidateKeys)) {
      const derived = CLASSICAL_ADJECTIVES[k];
      if (derived && !seedSet.has(derived)) {
        candidateKeys.add(derived);
      }
    }
  }

  // Pre-calculate query centroid vector and individual seed vectors for on-demand local scoring
  const q = new Float32Array(D);
  const positiveSeedVecs: Float32Array[] = [];

  for (const s of positiveSeeds) {
    let idx = wordToIndex.get(s);
    if (idx === undefined && CLASSICAL_ADJECTIVES[s]) {
      idx = wordToIndex.get(CLASSICAL_ADJECTIVES[s]);
    }
    if (idx !== undefined && vectorBuffer) {
      const sv = new Float32Array(D);
      const off = idx * D;
      let sSumSq = 0;
      for (let d = 0; d < D; d++) {
        const val = vectorBuffer[off + d] / 127.0;
        sv[d] = val;
        sSumSq += val * val;
        q[d] += val;
      }
      const sNorm = Math.sqrt(sSumSq);
      if (sNorm > 1e-9) {
        const invSNorm = 1.0 / sNorm;
        for (let d = 0; d < D; d++) sv[d] *= invSNorm;
      }
      positiveSeedVecs.push(sv);
    }
  }
  for (const s of negativeSeeds) {
    const idx = wordToIndex.get(s);
    if (idx !== undefined && vectorBuffer) {
      const off = idx * D;
      for (let d = 0; d < D; d++) q[d] -= 0.85 * (vectorBuffer[off + d] / 127.0);
    }
  }
  let qSumSq = 0;
  for (let d = 0; d < D; d++) qSumSq += q[d] * q[d];
  const qN = Math.sqrt(qSumSq);
  if (qN > 1e-9) {
    const invQ = 1.0 / qN;
    for (let d = 0; d < D; d++) q[d] *= invQ;
  }
  const hasMultipleSeeds = positiveSeedVecs.length >= 2;
  const NICHE_WORDS_SET = new Set(NICHE_VOCABULARY.map((n) => n.word.toLowerCase()));

  const blendedList: Array<{
    word: string;
    blendedScore: number;
    partOfSpeech?: PartOfSpeech;
    definition?: string;
  }> = [];

  for (const word of candidateKeys) {
    if (seedSet.has(word) || directAntonyms.has(word)) continue;

    let locScore = localScoreMap.get(word) || 0;
    const onEntry = onlineScoreMap.get(word);
    const onScore = onEntry ? Math.max(-1.5, onEntry.score / maxOnline) : 0;

    // If word wasn't in top local hits, compute its exact local score
    if (locScore === 0 && wordToIndex.has(word) && vectorBuffer) {
      const idx = wordToIndex.get(word)!;
      const off = idx * D;
      let dot = 0;
      for (let d = 0; d < D; d += 10) {
        dot +=
          q[d] * vectorBuffer[off + d] +
          q[d + 1] * vectorBuffer[off + d + 1] +
          q[d + 2] * vectorBuffer[off + d + 2] +
          q[d + 3] * vectorBuffer[off + d + 3] +
          q[d + 4] * vectorBuffer[off + d + 4] +
          q[d + 5] * vectorBuffer[off + d + 5] +
          q[d + 6] * vectorBuffer[off + d + 6] +
          q[d + 7] * vectorBuffer[off + d + 7] +
          q[d + 8] * vectorBuffer[off + d + 8] +
          q[d + 9] * vectorBuffer[off + d + 9];
      }
      const rawCos = dot * invNorms[idx];
      if (rawCos > 0.05) {
        // 1. Triangulation multiplier
        let triMul = 1.0;
        if (hasMultipleSeeds) {
          let minSeedSim = 999.0;
          for (let s = 0; s < positiveSeedVecs.length; s++) {
            const sv = positiveSeedVecs[s];
            let sDot = 0;
            for (let d = 0; d < D; d += 10) {
              sDot +=
                sv[d] * vectorBuffer[off + d] +
                sv[d + 1] * vectorBuffer[off + d + 1] +
                sv[d + 2] * vectorBuffer[off + d + 2] +
                sv[d + 3] * vectorBuffer[off + d + 3] +
                sv[d + 4] * vectorBuffer[off + d + 4] +
                sv[d + 5] * vectorBuffer[off + d + 5] +
                sv[d + 6] * vectorBuffer[off + d + 6] +
                sv[d + 7] * vectorBuffer[off + d + 7] +
                sv[d + 8] * vectorBuffer[off + d + 8] +
                sv[d + 9] * vectorBuffer[off + d + 9];
            }
            const sSim = sDot * invNorms[idx];
            if (sSim < minSeedSim) minSeedSim = sSim;
          }

          if (minSeedSim >= 0.28) {
            triMul = 1.0 + 0.18 * minSeedSim;
          } else if (minSeedSim < 0.12) {
            triMul = 0.82;
          }
        }

        // 2. Register curve
        const isNiche = NICHE_WORDS_SET.has(word);
        let regMul = 1.0;
        if (idx < 2200) {
          regMul = rawCos > 0.78 ? 1.0 : 0.92;
        } else if (idx <= 22000) {
          regMul = 1.10;
        } else if (idx <= 38000 || isNiche) {
          if (rawCos >= 0.56) regMul = 1.08;
          else if (rawCos >= 0.48) regMul = 0.95;
          else regMul = 0.78;
        } else {
          if (rawCos >= 0.64) regMul = 1.0;
          else regMul = 0.70;
        }

        // 3. POS-alignment multiplier
        const posMask = vocabMetadata[idx][1];
        const posMul = (posMask & dominantPosMask) !== 0 ? 1.12 : 1.0;

        // 4. Morphological clone suppression
        const cloneMul = isMorphologicalClone(word, positiveSeeds) ? 0.85 : 1.0;

        const rawScore = rawCos * triMul * regMul * posMul * cloneMul;
        locScore = maxRawLocal > 0 ? Math.max(0, rawScore / maxRawLocal) : 0;
      }
    }

    let score = 0;
    if (locScore > 0 && onScore > 0) {
      score = 0.75 * locScore + 0.25 * onScore;
    } else if (locScore > 0 && onScore < 0) {
      score = 0.75 * locScore + 0.25 * onScore;
    } else if (locScore > 0) {
      score = 0.75 * locScore;
    } else if (onScore > 0) {
      score = 0.25 * onScore;
    }

    if (score <= 0.05) continue;

    // Check definition from Datamuse if available
    let def: string | undefined;
    let pos: PartOfSpeech | undefined;
    if (onEntry?.defs) {
      const parsedDef = parseDatamuseDef(onEntry.defs);
      def = parsedDef.definition;
      pos = parsedDef.pos || parseDatamusePos(onEntry.tags);
    }

    blendedList.push({
      word,
      blendedScore: score,
      partOfSpeech: pos,
      definition: def,
    });
  }

  // Morphological boost for adjective forms in adjective queries
  if (dominantPosMask === 4) {
    const tempScoreMap = new Map<string, number>();
    for (const b of blendedList) {
      tempScoreMap.set(b.word, b.blendedScore);
    }
    for (const b of blendedList) {
      for (const [noun, adj] of Object.entries(CLASSICAL_ADJECTIVES)) {
        if (b.word === adj) {
          const nounScore = tempScoreMap.get(noun) || 0;
          if (nounScore > 0) {
            b.blendedScore = Math.max(b.blendedScore, nounScore * 1.15);
          }
        }
      }
    }
  }

  // Inject Niche Vocabulary bank for high-confidence concept matches
  const nicheMatches = searchNicheVocabulary(positiveSeeds);
  for (const n of nicheMatches) {
    const nw = n.word.toLowerCase();
    if (seedSet.has(nw)) continue;
    if (n.matchScore >= 8.0) {
      const existing = blendedList.find((b) => b.word.toLowerCase() === nw);
      const nicheScore = Math.min(1.0, 0.65 + (n.matchScore / 25) * 0.35);
      if (existing) {
        existing.blendedScore = Math.max(existing.blendedScore, nicheScore);
        if (!existing.definition) existing.definition = n.definition;
        if (!existing.partOfSpeech) existing.partOfSpeech = n.partOfSpeech;
      } else {
        blendedList.push({
          word: n.word,
          blendedScore: nicheScore,
          partOfSpeech: n.partOfSpeech,
          definition: n.definition,
        });
      }
    }
  }

  blendedList.sort((a, b) => b.blendedScore - a.blendedScore);

  const topHits = blendedList.slice(0, limit);
  if (topHits.length === 0) return [];

  const maxScore = topHits[0].blendedScore;

  // 4. Enrich top hits with definitions and POS from WordNet / Niche
  const enrichedHits: VectorSearchResult[] = [];

  for (let idx = 0; idx < topHits.length; idx++) {
    const item = topHits[idx];
    const ratio = maxScore > 0 ? item.blendedScore / maxScore : 1.0;
    const rankDecay = Math.max(0, 1.0 - idx * 0.012);
    const scoreVal = ratio * 0.80 + rankDecay * 0.20;
    const matchPercent = Math.min(99, Math.max(50, Math.round(scoreVal * 98)));

    let finalDef = item.definition;
    let finalPos = item.partOfSpeech;

    // Lazy offline dictionary lookup
    const off = await lookupOffline(item.word);
    if (off && off.meanings.length > 0) {
      // Find meaning matching dominant POS if available
      const matching = off.meanings.find((m) => m.partOfSpeech === dominantPosStr);
      const chosen = matching || off.meanings[0];
      if (chosen.definitions.length > 0) {
        // Filter out undesired definitions (e.g. Austronesian language for oceanic)
        if (item.word === 'oceanic' && dominantPosStr === 'adjective') {
          const adjSense = off.meanings.find((m) => m.partOfSpeech === 'adjective');
          if (adjSense && adjSense.definitions.length > 0) {
            finalDef = adjSense.definitions[0];
            finalPos = 'adjective';
          }
        } else if (!finalDef) {
          finalDef = chosen.definitions[0];
        }
      }
      if (!finalPos || (dominantPosStr === 'adjective' && chosen.partOfSpeech === 'adjective')) {
        finalPos = chosen.partOfSpeech;
      }
    }

    if (!finalPos) {
      finalPos = dominantPosStr;
    }

    enrichedHits.push({
      word: item.word,
      similarity: Number(ratio.toFixed(4)),
      matchPercent,
      score: Math.round(item.blendedScore * 1000),
      rawScore: item.blendedScore,
      source: 'hybrid',
      partOfSpeech: finalPos,
      definition: finalDef,
    });
  }

  // Ensure strict descending order of similarity
  enrichedHits.sort((a, b) => b.similarity - a.similarity);

  return enrichedHits;
}

/**
 * Main vector search entrypoint:
 * Takes multiple seed words, projects them into 128D embedding space,
 * and returns ranked results by semantic vector closeness.
 */
export async function searchVectorSynonyms(
  query: string,
  preferences?: ExtensionPreferences,
  limit = 50
): Promise<VectorSearchResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  const seeds = extractSeedWords(clean);
  if (seeds.length === 0) return [];

  const cacheKey = `${seeds.sort().join('+')}:${preferences?.offlineOnly ? 'off' : 'on'}:${limit}`;
  if (vectorMemoryCache.has(cacheKey)) {
    return vectorMemoryCache.get(cacheKey)!;
  }

  const isOfflineOnly = !!preferences?.offlineOnly;

  if (isOfflineOnly) {
    const offlineHits = searchOfflineVector(clean, limit);
    vectorMemoryCache.set(cacheKey, offlineHits);
    return offlineHits;
  }

  try {
    const hybridHits = await searchHybridVector(clean, limit);
    if (hybridHits.length > 0) {
      vectorMemoryCache.set(cacheKey, hybridHits);
      return hybridHits;
    }
  } catch {
    // Fall back to offline vector search
  }

  const fallbackHits = searchOfflineVector(clean, limit);
  vectorMemoryCache.set(cacheKey, fallbackHits);
  return fallbackHits;
}
