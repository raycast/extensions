import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { NICHE_VOCABULARY } from '../src/data/niche-vocabulary';

const D = 100;
const TARGET_GLOVE_WORDS = 44800;

const STOP_WORDS = new Set([
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
  'yourself', 'yourselves', 'etc',
]);

function isValidLemma(word: string): boolean {
  if (!word || word.length < 3 || word.length > 24) return false;
  if (STOP_WORDS.has(word)) return false;
  return /^[a-z]{3,24}$/.test(word);
}

// Download GloVe 100D and cache to .cache/glove.6B.100d.txt
async function ensureGloveFile(cachePath: string) {
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 300 * 1024 * 1024) {
    console.log(`Using cached GloVe file: ${cachePath} (${(fs.statSync(cachePath).size / (1024 * 1024)).toFixed(1)} MB)`);
    return;
  }

  const cacheDir = path.dirname(cachePath);
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const urls = [
    'https://huggingface.co/Seci84/glove_word2vec/resolve/main/glove.6B.100d.txt',
    'https://huggingface.co/ai-forever/paper_persi_chat/resolve/5f0ba56528b0bc2eba2cea2576aa6deaf45646f9/glove.6B.100d.txt',
  ];

  let res: Response | null = null;
  for (const u of urls) {
    try {
      console.log(`Attempting download from ${u}...`);
      const r = await fetch(u, { redirect: 'follow' });
      if (r.ok && r.body) {
        res = r;
        console.log(`Connected! Status: ${r.status}, Content-Length: ${r.headers.get('content-length')}`);
        break;
      }
    } catch (err: any) {
      console.warn(`Mirror failed ${u}:`, err.message);
    }
  }

  if (!res || !res.body) {
    throw new Error('Failed to download glove.6B.100d.txt from all mirrors');
  }

  const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
  let downloadedBytes = 0;
  const webStream = res.body;
  const nodeStream = Readable.fromWeb(webStream as any);

  let lastLog = Date.now();
  nodeStream.on('data', (chunk: Buffer) => {
    downloadedBytes += chunk.length;
    if (Date.now() - lastLog > 3000) {
      const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
      const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
      const pct = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?';
      console.log(`Downloading GloVe: ${mb} MB / ${totalMb} MB (${pct}%)...`);
      lastLog = Date.now();
    }
  });

  const tempPath = cachePath + '.tmp';
  const out = fs.createWriteStream(tempPath);
  await pipeline(nodeStream, out);

  fs.renameSync(tempPath, cachePath);
  console.log(`Download complete! Saved to ${cachePath}`);
}

export async function buildVectorDb() {
  const startTime = Date.now();
  const projectRoot = path.resolve(__dirname, '..');
  const cachePath = path.join(projectRoot, '.cache', 'glove.6B.100d.txt');
  const wordnetDir = path.join(projectRoot, 'assets', 'wordnet-db');
  const rogetJsonPath = path.join(projectRoot, 'assets', 'roget-thesaurus.json');
  const outputBinPath = path.join(projectRoot, 'assets', 'word-vectors.bin');
  const outputVocabPath = path.join(projectRoot, 'assets', 'word-vectors.vocab.json');

  console.log('=== [1/5] Downloading / Verifying Pre-Trained GloVe 100D ===');
  await ensureGloveFile(cachePath);

  console.log('=== [2/5] Scanning WordNet & Roget Thesaurus Lexicon ===');
  const posBitmasks: Record<string, number> = {
    noun: 1, // 1 << 0
    verb: 2, // 1 << 1
    adj: 4,  // 1 << 2
    adv: 8,  // 1 << 3
  };

  const validLemmas = new Set<string>();
  const lemmaPosMap = new Map<string, number>();
  const synsets: string[][] = [];
  const synsetByOffset = new Map<string, string[]>();
  const satellitePairs: Array<[string, string]> = [];
  const antonymPairs: Array<[string, string]> = [];

  // Scan WordNet index.* files to collect all official base lemmas
  for (const [pos, mask] of Object.entries(posBitmasks)) {
    const idxFile = path.join(wordnetDir, `index.${pos}`);
    if (fs.existsSync(idxFile)) {
      const content = fs.readFileSync(idxFile, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line || line.startsWith('  ')) continue;
        const lemma = line.split(' ')[0].toLowerCase();
        if (isValidLemma(lemma)) {
          validLemmas.add(lemma);
          lemmaPosMap.set(lemma, (lemmaPosMap.get(lemma) || 0) | mask);
        }
      }
    }
  }

  // Parse WordNet data.* files
  // Pass 1: Scan all synsets across all 4 files to populate synsetByOffset
  const parsedMetaLines: Array<{ meta: string[]; synsetLemmas: string[]; mask: number }> = [];

  for (const [pos, mask] of Object.entries(posBitmasks)) {
    const dataFile = path.join(wordnetDir, `data.${pos}`);
    if (!fs.existsSync(dataFile)) continue;
    console.log(`Parsing WordNet data.${pos}...`);
    const content = fs.readFileSync(dataFile, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('  ')) continue;

      const barIdx = line.indexOf('|');
      const meta = (barIdx !== -1 ? line.slice(0, barIdx) : line).trim().split(/\s+/);
      if (meta.length < 5) continue;

      const offset = meta[0];
      const wCount = parseInt(meta[3], 16);
      if (isNaN(wCount) || wCount <= 0) continue;

      const synsetLemmas: string[] = [];
      for (let w = 0; w < wCount; w++) {
        const rawWord = meta[4 + w * 2];
        if (!rawWord || rawWord.includes('_')) continue;
        const clean = rawWord.toLowerCase();
        if (isValidLemma(clean)) {
          synsetLemmas.push(clean);
          validLemmas.add(clean);
          lemmaPosMap.set(clean, (lemmaPosMap.get(clean) || 0) | mask);
        }
      }

      if (synsetLemmas.length > 0) {
        synsetByOffset.set(offset, synsetLemmas);
        synsets.push(synsetLemmas);
      }
      parsedMetaLines.push({ meta, synsetLemmas, mask });
    }
  }

  // Pass 2: Parse all pointers (& for satellites, ! for antonyms) with complete synset lookup
  for (const { meta, synsetLemmas } of parsedMetaLines) {
    const wCount = parseInt(meta[3], 16);
    const pCountIdx = 4 + wCount * 2;
    const pCount = parseInt(meta[pCountIdx], 10);
    if (!isNaN(pCount) && pCount > 0) {
      for (let p = 0; p < pCount; p++) {
        const ptrIdx = pCountIdx + 1 + p * 4;
        if (ptrIdx + 3 < meta.length) {
          const sym = meta[ptrIdx];
          const targetOffset = meta[ptrIdx + 1];
          const srcTargetHex = meta[ptrIdx + 3];

          if (sym === '&') {
            // Satellite pointer
            const targetLemmas = synsetByOffset.get(targetOffset);
            if (targetLemmas && synsetLemmas.length > 0) {
              for (const u of synsetLemmas) {
                for (const v of targetLemmas) {
                  if (u !== v) satellitePairs.push([u, v]);
                }
              }
            }
          } else if (sym === '!') {
            // Antonym pointer
            const srcIdx = parseInt(srcTargetHex.slice(0, 2), 16);
            const tgtIdx = parseInt(srcTargetHex.slice(2, 4), 16);
            const targetLemmas = synsetByOffset.get(targetOffset);

            if (srcIdx > 0 && tgtIdx > 0) {
              const srcWord = meta[4 + (srcIdx - 1) * 2]?.toLowerCase();
              if (srcWord && isValidLemma(srcWord) && targetLemmas) {
                const tgtWord = targetLemmas[tgtIdx - 1];
                if (tgtWord && isValidLemma(tgtWord) && srcWord !== tgtWord) {
                  antonymPairs.push([srcWord, tgtWord]);
                }
              }
            } else if (synsetLemmas.length > 0 && targetLemmas) {
              for (const u of synsetLemmas) {
                for (const v of targetLemmas) {
                  if (u !== v) antonymPairs.push([u, v]);
                }
              }
            }
          }
        }
      }
    }
  }

  // Parse Roget Thesaurus semicolon clauses (only linking valid WordNet lemmas)
  console.log('Parsing Roget Thesaurus semicolon clauses...');
  const rogetClauses: string[][] = [];
  if (fs.existsSync(rogetJsonPath)) {
    const rogetData = JSON.parse(fs.readFileSync(rogetJsonPath, 'utf8'));
    for (const entry of rogetData.entries || []) {
      const text = (entry.body || '').replace(/^(\[[^\]]*\]\s*)?[A-Za-z\s,;'-]+—\s*/, '');
      const sections = text.split(/\b(?:N|V|Adj|Adv|Int|Phr)\.\s+/g);
      for (const sec of sections) {
        const clauses = sec.split(/[;\n]+/);
        for (const clause of clauses) {
          const rawTokens = clause
            .toLowerCase()
            .replace(/\[[^\]]*\]/g, '')
            .replace(/&c\.?/g, '')
            .split(/[,/\s]+/)
            .map((w) => w.replace(/^[^a-z]+|[^a-z]+$/g, ''))
            .filter((w) => isValidLemma(w) && validLemmas.has(w));

          const unique = Array.from(new Set(rawTokens));
          if (unique.length >= 2) {
            rogetClauses.push(unique);
          }
        }
      }
    }
  }

  // Add all words from Niche Vocabulary
  const nicheWordsSet = new Set<string>();
  const nicheConceptWords = new Set<string>();

  for (const n of NICHE_VOCABULARY) {
    const w = n.word.toLowerCase();
    nicheWordsSet.add(w);
    let mask = 1;
    if (n.partOfSpeech === 'noun') mask = 1;
    else if (n.partOfSpeech === 'verb') mask = 2;
    else if (n.partOfSpeech === 'adjective') mask = 4;
    else if (n.partOfSpeech === 'adverb') mask = 8;
    lemmaPosMap.set(w, (lemmaPosMap.get(w) || 0) | mask);

    for (const phrase of n.concepts) {
      const parts = phrase.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
      for (const p of parts) {
        if (isValidLemma(p)) {
          nicheConceptWords.add(p);
        }
      }
    }

    const defParts = n.definition.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
    for (const p of defParts) {
      if (isValidLemma(p)) {
        nicheConceptWords.add(p);
      }
    }
  }

  console.log(`Extracted ${validLemmas.size} valid dictionary lemmas, ${antonymPairs.length} antonym pairs.`);

  console.log('=== [3/5] Streaming GloVe & Selecting 44,800 Frequency-Ordered Words ===');
  const selectedWords: string[] = [];
  const selectedSet = new Set<string>();
  const gloveVectors = new Map<string, Float32Array>();

  const fileStream = fs.createReadStream(cachePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;
    const spIdx = line.indexOf(' ');
    if (spIdx === -1) continue;

    const word = line.slice(0, spIdx).toLowerCase();

    // If needed for vocabulary or for niche word synthesis
    const isNeededForVocab = selectedWords.length < TARGET_GLOVE_WORDS && validLemmas.has(word) && !selectedSet.has(word);
    const isNeededForNiche = nicheWordsSet.has(word) || nicheConceptWords.has(word);

    if (isNeededForVocab || isNeededForNiche) {
      const parts = line.slice(spIdx + 1).trim().split(/\s+/);
      if (parts.length >= D) {
        const vec = new Float32Array(D);
        for (let d = 0; d < D; d++) {
          vec[d] = parseFloat(parts[d]);
        }

        if (isNeededForVocab) {
          selectedWords.push(word);
          selectedSet.add(word);
          gloveVectors.set(word, vec);
        } else if (isNeededForNiche && !gloveVectors.has(word)) {
          gloveVectors.set(word, vec);
        }
      }
    }

    if (selectedWords.length >= TARGET_GLOVE_WORDS && nicheWordsSet.size > 0) {
      // Check if all niche concept words are collected
      let allFound = true;
      for (const nw of nicheWordsSet) {
        if (!gloveVectors.has(nw)) {
          allFound = false;
          break;
        }
      }
      if (allFound) break;
    }
  }

  console.log(`Selected ${selectedWords.length} frequency-ordered words from GloVe.`);

  // Append Niche Vocabulary words at indices 44,800+
  console.log('Integrating Niche Vocabulary bank (indices 44,800+)...');
  for (const n of NICHE_VOCABULARY) {
    const w = n.word.toLowerCase();
    if (!selectedSet.has(w)) {
      let vec = gloveVectors.get(w);
      if (!vec) {
        // Synthesize vector as L2-normalized average of concepts and definition keywords
        vec = new Float32Array(D);
        let count = 0;
        const allKeywords: string[] = [];

        for (const phrase of n.concepts) {
          const parts = phrase.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
          for (const p of parts) if (isValidLemma(p)) allKeywords.push(p);
        }
        for (const p of n.definition.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) {
          if (isValidLemma(p)) allKeywords.push(p);
        }

        for (const kw of allKeywords) {
          const kwVec = gloveVectors.get(kw);
          if (kwVec) {
            for (let d = 0; d < D; d++) vec[d] += kwVec[d];
            count++;
          }
        }

        if (count > 0) {
          let sumSq = 0;
          for (let d = 0; d < D; d++) {
            vec[d] /= count;
            sumSq += vec[d] * vec[d];
          }
          const norm = Math.sqrt(sumSq);
          if (norm > 1e-9) {
            for (let d = 0; d < D; d++) vec[d] /= norm;
          }
        }
      }

      selectedWords.push(w);
      selectedSet.add(w);
      gloveVectors.set(w, vec);
    }
  }

  const N = selectedWords.length;
  console.log(`Final vocabulary size: ${N} words (preserving exact frequency order).`);

  const wordToIndex = new Map<string, number>();
  const vocabMetadata: Array<[string, number]> = [];

  for (let i = 0; i < N; i++) {
    const word = selectedWords[i];
    wordToIndex.set(word, i);
    const mask = lemmaPosMap.get(word) || 1;
    vocabMetadata.push([word, mask]);
  }

  console.log('=== [4/5] All-but-the-Top Centering + Attract-Repel Retrofitting (12 Iterations) ===');
  // Copy vectors into flat Float32Array
  const V = new Float32Array(N * D);
  for (let i = 0; i < N; i++) {
    const w = selectedWords[i];
    const vec = gloveVectors.get(w);
    if (vec) {
      V.set(vec, i * D);
    }
  }

  // Mu & Viswanath (ICLR 2018): All-but-the-Top Mean Centering & Top PC Removal
  console.log('Subtracting global mean vector and removing top principal component...');
  const mean = new Float64Array(D);
  for (let i = 0; i < N; i++) {
    const off = i * D;
    for (let d = 0; d < D; d++) mean[d] += V[off + d];
  }
  for (let d = 0; d < D; d++) mean[d] /= N;

  for (let i = 0; i < N; i++) {
    const off = i * D;
    for (let d = 0; d < D; d++) V[off + d] -= mean[d];
  }

  // Compute 1st principal component u1 via 10 power iterations
  let p = new Float64Array(D);
  p[0] = 1.0; // Deterministic initial vector
  for (let iter = 0; iter < 10; iter++) {
    const q = new Float64Array(D);
    for (let i = 0; i < N; i++) {
      const off = i * D;
      let dot = 0;
      for (let d = 0; d < D; d++) dot += V[off + d] * p[d];
      for (let d = 0; d < D; d++) q[d] += dot * V[off + d];
    }
    let sumSq = 0;
    for (let d = 0; d < D; d++) sumSq += q[d] * q[d];
    const norm = Math.sqrt(sumSq);
    for (let d = 0; d < D; d++) p[d] = norm > 0 ? q[d] / norm : 0;
  }

  // Remove projection on u1 and re-normalize to unit length
  for (let i = 0; i < N; i++) {
    const off = i * D;
    let proj = 0;
    for (let d = 0; d < D; d++) proj += V[off + d] * p[d];
    let sumSq = 0;
    for (let d = 0; d < D; d++) {
      V[off + d] -= proj * p[d];
      sumSq += V[off + d] * V[off + d];
    }
    const norm = Math.sqrt(sumSq);
    const invNorm = norm > 1e-9 ? 1.0 / norm : 0;
    for (let d = 0; d < D; d++) V[off + d] *= invNorm;
  }

  // Anchor vectors Q_hat
  const Q_hat = new Float32Array(V);
  const Q = new Float32Array(V);
  const nextQ = new Float32Array(N * D);

  // Build Adjacency lists for Attract
  console.log('Building lexical adjacency for Attract pass...');
  const neighbors: Array<Array<{ j: number; weight: number }>> = Array.from({ length: N }, () => []);

  function addNeighborEdge(w1: string, w2: string, weight: number) {
    const i = wordToIndex.get(w1);
    const j = wordToIndex.get(w2);
    if (i !== undefined && j !== undefined && i !== j) {
      neighbors[i].push({ j, weight });
      neighbors[j].push({ j: i, weight });
    }
  }

  // WordNet synset peers (weight 2.2)
  for (const syn of synsets) {
    for (let a = 0; a < syn.length; a++) {
      for (let b = a + 1; b < syn.length; b++) {
        addNeighborEdge(syn[a], syn[b], 2.2);
      }
    }
  }

  // WordNet satellites / similar-to pointers (weight 1.4)
  for (const [u, v] of satellitePairs) {
    addNeighborEdge(u, v, 1.4);
  }

  // Roget same-semicolon-clause peers (weight 0.8)
  for (const clause of rogetClauses) {
    for (let a = 0; a < clause.length; a++) {
      for (let b = a + 1; b < clause.length; b++) {
        addNeighborEdge(clause[a], clause[b], 0.8);
      }
    }
  }

  // Niche concept connections (weight 2.5)
  for (const n of NICHE_VOCABULARY) {
    const nw = n.word.toLowerCase();
    for (const phrase of n.concepts) {
      const parts = phrase.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
      for (const p of parts) {
        if (isValidLemma(p)) addNeighborEdge(nw, p, 2.5);
      }
    }
  }

  // Filter and deduplicate neighbors
  let totalAttractEdges = 0;
  for (let i = 0; i < N; i++) {
    const map = new Map<number, number>();
    for (const edge of neighbors[i]) {
      map.set(edge.j, (map.get(edge.j) || 0) + edge.weight);
    }
    neighbors[i] = Array.from(map.entries()).map(([j, weight]) => ({ j, weight }));
    totalAttractEdges += neighbors[i].length;
  }
  console.log(`Attract graph: ${totalAttractEdges} directed edges across vocabulary.`);

  // Antonym pairs for Repel
  const indexedAntonyms: Array<[number, number]> = [];
  for (const [u, v] of antonymPairs) {
    const i = wordToIndex.get(u);
    const j = wordToIndex.get(v);
    if (i !== undefined && j !== undefined && i !== j) {
      indexedAntonyms.push([i, j]);
    }
  }
  console.log(`Repel graph: ${indexedAntonyms.length} valid antonym pairs.`);

  // 12 Iterations of Attract-Repel Pass
  console.log('Running 12 iterations of Attract-Repel Retrofitting...');
  const alpha = 1.2;

  for (let iter = 1; iter <= 12; iter++) {
    const iterStart = Date.now();

    // 1. Attract step
    for (let i = 0; i < N; i++) {
      const nList = neighbors[i];
      const iOff = i * D;
      if (!nList || nList.length === 0) {
        for (let d = 0; d < D; d++) nextQ[iOff + d] = Q[iOff + d];
        continue;
      }

      let totalWeight = 0;
      const acc = new Float64Array(D);
      for (let k = 0; k < nList.length; k++) {
        const { j, weight } = nList[k];
        totalWeight += weight;
        const jOff = j * D;
        for (let d = 0; d < D; d++) acc[d] += weight * Q[jOff + d];
      }

      if (totalWeight > 0) {
        // Faruqui-normalized degree-invariant neighbor pull
        // Average neighbor weight (2.2 for synsets, 1.4 for satellites, 0.8 for Roget)
        const avgWeight = totalWeight / nList.length;
        const denom = alpha + avgWeight;
        const invTotal = 1.0 / totalWeight;
        for (let d = 0; d < D; d++) {
          const avgNeighbor = acc[d] * invTotal;
          nextQ[iOff + d] = (alpha * Q_hat[iOff + d] + avgWeight * avgNeighbor) / denom;
        }
      } else {
        for (let d = 0; d < D; d++) nextQ[iOff + d] = Q[iOff + d];
      }
    }
    Q.set(nextQ);

    // 2. Repel step (Antonyms)
    for (let k = 0; k < indexedAntonyms.length; k++) {
      const [u, v] = indexedAntonyms[k];
      const uOff = u * D;
      const vOff = v * D;

      let dot = 0;
      for (let d = 0; d < D; d++) dot += Q[uOff + d] * Q[vOff + d];

      if (dot > -0.1) {
        for (let d = 0; d < D; d++) {
          const qu = Q[uOff + d];
          const qv = Q[vOff + d];
          Q[uOff + d] = qu - 0.35 * qv;
          Q[vOff + d] = qv - 0.35 * qu;
        }
      }
    }

    // 3. Re-normalize to unit length
    for (let i = 0; i < N; i++) {
      const off = i * D;
      let sumSq = 0;
      for (let d = 0; d < D; d++) sumSq += Q[off + d] * Q[off + d];
      const norm = Math.sqrt(sumSq);
      const invNorm = norm > 1e-9 ? 1.0 / norm : 0;
      for (let d = 0; d < D; d++) Q[off + d] *= invNorm;
    }

    console.log(`Iteration ${iter}/12 completed in ${Date.now() - iterStart}ms`);
  }

  // Final mean centering and L2 normalization
  console.log('Post-retrofitting mean centering and L2 normalization...');
  const postMean = new Float64Array(D);
  for (let i = 0; i < N; i++) {
    const off = i * D;
    for (let d = 0; d < D; d++) postMean[d] += Q[off + d];
  }
  for (let d = 0; d < D; d++) postMean[d] /= N;

  for (let i = 0; i < N; i++) {
    const off = i * D;
    let sumSq = 0;
    for (let d = 0; d < D; d++) {
      Q[off + d] -= postMean[d];
      sumSq += Q[off + d] * Q[off + d];
    }
    const norm = Math.sqrt(sumSq);
    const invNorm = norm > 1e-9 ? 1.0 / norm : 0;
    for (let d = 0; d < D; d++) Q[off + d] *= invNorm;
  }

  console.log('=== [5/5] Int8 Quantization & Frequency-Indexed Binary Output ===');
  const int8Buffer = new Int8Array(N * D);

  for (let i = 0; i < N; i++) {
    const off = i * D;
    for (let d = 0; d < D; d++) {
      let scaled = Math.round(Q[off + d] * 127);
      if (scaled > 127) scaled = 127;
      if (scaled < -127) scaled = -127;
      int8Buffer[off + d] = scaled;
    }
  }

  console.log(`Writing binary database to ${outputBinPath}...`);
  fs.writeFileSync(outputBinPath, Buffer.from(int8Buffer.buffer));
  const binStat = fs.statSync(outputBinPath);
  console.log(`Saved word-vectors.bin: ${binStat.size} bytes (${(binStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  console.log(`Writing vocabulary metadata to ${outputVocabPath}...`);
  fs.writeFileSync(outputVocabPath, JSON.stringify(vocabMetadata));
  const vocabStat = fs.statSync(outputVocabPath);
  console.log(`Saved word-vectors.vocab.json: ${vocabStat.size} bytes (${(vocabStat.size / 1024).toFixed(1)} KB)`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n GloVe 100D Attract-Repel Vector Database built successfully in ${elapsed}s!`);
}

if (require.main === module || (process.argv[1] && process.argv[1].endsWith('build-vector-db.ts'))) {
  buildVectorDb().catch((err) => {
    console.error('Failed to build vector database:', err);
    process.exit(1);
  });
}
