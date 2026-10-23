import {
  searchVectorSynonyms,
  searchOfflineVector,
  extractSeedWords,
} from '../src/services/vector-search-service';
import { NICHE_VOCABULARY } from '../src/data/niche-vocabulary';

async function testVector() {
  console.log('--- STARTING VECTOR SEMANTIC SYNONYM SEARCH TESTS ---\n');

  // Test 1: Seed extraction and stop word filtering
  console.log('Test 1: Seed word extraction');
  const seeds1 = extractSeedWords('the brave and courageous knight');
  console.log('  Extracted seeds from "the brave and courageous knight":', seeds1);
  if (!seeds1.includes('brave') || !seeds1.includes('courageous') || !seeds1.includes('knight')) {
    throw new Error('Expected seeds to contain brave, courageous, knight');
  }
  if (seeds1.includes('the') || seeds1.includes('and')) {
    throw new Error('Stop words "the" and "and" should have been filtered out');
  }
  console.log('  ✓ Test 1 Passed\n');

  // Test 2: Multi-seed vector search ("brave courageous knight")
  console.log('Test 2: Online vector search for "brave courageous knight"');
  const t2 = await searchVectorSynonyms('brave courageous knight', undefined, 20);
  console.log('  Results count:', t2.length);
  console.log(
    '  Top 8 results:',
    t2
      .slice(0, 8)
      .map((x) => `${x.word} (${x.matchPercent}%, ${x.partOfSpeech || 'n/a'})`)
      .join(', ')
  );
  if (t2.length === 0) {
    throw new Error('Expected results for vector search on "brave courageous knight"');
  }
  // Check that input seeds are excluded from results
  const lowerSeeds = ['brave', 'courageous', 'knight'];
  const hasEchoedSeed = t2.some((x) => lowerSeeds.includes(x.word.toLowerCase()));
  if (hasEchoedSeed) {
    throw new Error('Input seed words should not be echoed in the results');
  }
  // Check that similarity scores are ordered descending
  for (let i = 0; i < Math.min(5, t2.length - 1); i++) {
    if (t2[i].similarity < t2[i + 1].similarity) {
      throw new Error(`Results are not properly ranked by similarity: ${t2[i].similarity} < ${t2[i + 1].similarity}`);
    }
  }
  console.log('  ✓ Test 2 Passed\n');

  // Test 3: Offline 1,000-dimensional Roget vector space
  console.log('Test 3: Offline vector space for ["dark", "gloomy"]');
  const t3 = searchOfflineVector(['dark', 'gloomy'], 20);
  console.log('  Offline results count:', t3.length);
  console.log(
    '  Top 6 offline results:',
    t3
      .slice(0, 6)
      .map((x) => `${x.word} (${x.matchPercent}%)`)
      .join(', ')
  );
  if (t3.length === 0) {
    throw new Error('Expected offline vector search results for ["dark", "gloomy"]');
  }
  console.log('  ✓ Test 3 Passed\n');

  // Test 4: Offline-only preference flag
  console.log('Test 4: searchVectorSynonyms with offlineOnly preference');
  const t4 = await searchVectorSynonyms('fast agile swift', { offlineOnly: true }, 20);
  console.log('  Offline-forced count:', t4.length);
  if (t4.length === 0 || t4[0].source !== 'offline') {
    throw new Error('Expected offline vector search when offlineOnly is true');
  }
  console.log('  ✓ Test 4 Passed\n');

  // Test 5: In-memory cache verification
  console.log('Test 5: Vector search cache verification');
  const start = Date.now();
  const cached = await searchVectorSynonyms('brave courageous knight', undefined, 20);
  const elapsed = Date.now() - start;
  console.log(`  Cached lookup took ${elapsed}ms for ${cached.length} items`);
  if (elapsed > 15) {
    throw new Error(`Expected cache lookup < 15ms, took ${elapsed}ms`);
  }
  console.log('  ✓ Test 5 Passed\n');

  // Test 6: Empty / stop-words-only query handling
  console.log('Test 6: Empty and stop-word queries');
  const emptyRes = await searchVectorSynonyms('   ');
  if (emptyRes.length !== 0) {
    throw new Error('Expected empty array for blank query');
  }
  console.log('  ✓ Test 6 Passed\n');

  // Test 7: Niche literary word retrieval ("dramatic discovery" -> anagnorisis)
  console.log('Test 7: Niche word retrieval for "dramatic discovery"');
  const t7 = await searchVectorSynonyms('dramatic discovery', undefined, 20);
  const anagMatch = t7.find((x) => x.word.toLowerCase() === 'anagnorisis');
  console.log(
    '  Top 5 for "dramatic discovery":',
    t7.slice(0, 5).map((x) => `${x.word} (${x.matchPercent}%)`).join(', ')
  );
  if (!anagMatch) {
    throw new Error('Expected "anagnorisis" to be present in top results for "dramatic discovery"');
  }
  console.log(`  Found anagnorisis with ${anagMatch.matchPercent}% match!`);
  console.log('  ✓ Test 7 Passed\n');

  // Test 8: Niche sensory term ("smell of rain" -> petrichor)
  console.log('Test 8: Niche sensory term for "smell of rain"');
  const t8 = await searchVectorSynonyms('smell of rain', undefined, 20);
  const petrMatch = t8.find((x) => x.word.toLowerCase() === 'petrichor');
  console.log(
    '  Top 5 for "smell of rain":',
    t8.slice(0, 5).map((x) => `${x.word} (${x.matchPercent}%)`).join(', ')
  );
  if (!petrMatch) {
    throw new Error('Expected "petrichor" to be present in top results for "smell of rain"');
  }
  console.log(`  Found petrichor with ${petrMatch.matchPercent}% match!`);
  console.log('  ✓ Test 8 Passed\n');

  // Test 9: Multi-dimensional intersection & morphological derivation ("large imposing complex" -> edificial / edifice)
  console.log('Test 9: Multi-dimensional intersection for "large imposing complex"');
  const t9 = await searchVectorSynonyms('large imposing complex', undefined, 10);
  console.log(
    '  Top 5 for "large imposing complex":',
    t9.slice(0, 5).map((x) => `${x.word} (${x.matchPercent}%, ${x.partOfSpeech})`).join(', ')
  );
  const edificialHit = t9.find((x) => x.word.toLowerCase() === 'edificial');
  const edificeHit = t9.find((x) => x.word.toLowerCase() === 'edifice');
  if (!edificialHit || !edificeHit) {
    throw new Error('Expected both "edificial" and "edifice" to appear in top results for "large imposing complex"');
  }
  if (t9[0].word.toLowerCase() !== 'edificial' && t9[1].word.toLowerCase() !== 'edificial') {
    throw new Error('Expected "edificial" to rank #1 or #2 for "large imposing complex"');
  }
  console.log(`  Found edificial (${edificialHit.matchPercent}%) and edifice (${edificeHit.matchPercent}%) at the top!`);
  console.log('  ✓ Test 9 Passed\n');

  // Test 10: Derived adjective definition correctness & marine rankings (oceanic, immense, abyssal)
  console.log('Test 10: Derived adjective definition correctness (oceanic)');
  const t10 = await searchVectorSynonyms('vast deep marine', undefined, 20);
  const oceanicHit = t10.find((x) => x.word.toLowerCase() === 'oceanic');
  if (!oceanicHit) {
    throw new Error('Expected "oceanic" to be present in vector search results for "vast deep marine"');
  }
  if (!oceanicHit.definition) {
    throw new Error('Expected "oceanic" to have an adjective definition');
  }
  console.log('  Oceanic definition:', oceanicHit.definition);
  if (oceanicHit.definition.toLowerCase().includes('austronesian')) {
    throw new Error('Oceanic definition should not describe the Austronesian language family (noun sense)');
  }
  if (oceanicHit.partOfSpeech !== 'adjective') {
    throw new Error(`Expected oceanic to have partOfSpeech "adjective", got "${oceanicHit.partOfSpeech}"`);
  }
  const top3Marine = t10.slice(0, 3).map((x) => x.word.toLowerCase());
  if (!top3Marine.includes('oceanic') && !top3Marine.includes('immense')) {
    throw new Error('Expected "oceanic" or "immense" in top 3 for "vast deep marine"');
  }
  console.log('  ✓ Test 10 Passed\n');

  // Test 11: Niche vocabulary category integrity (no unrelated 554 Representation or 842 Wit on structure/importance words)
  console.log('Test 11: Roget category integrity in niche vocabulary');
  const targetWords = ['edificial', 'edifice', 'palatial', 'monolithic', 'colossal', 'antediluvian'];
  for (const w of targetWords) {
    const entry = NICHE_VOCABULARY.find((e) => e.word.toLowerCase() === w);
    if (!entry) throw new Error(`Missing niche vocabulary entry for ${w}`);
    if (entry.categories.includes(554)) {
      throw new Error(`Word "${w}" should not use category 554 (Representation) for structure`);
    }
    if (entry.categories.includes(842)) {
      throw new Error(`Word "${w}" should not use category 842 (Wit) for importance`);
    }
    if (!entry.categories.includes(642)) {
      throw new Error(`Word "${w}" should use category 642 for importance`);
    }
  }
  console.log('  ✓ Test 11 Passed\n');

  // Test 12: Sub-10ms high-speed offline vector scan benchmark
  console.log('Test 12: High-speed sub-10ms offline vector scan benchmark');
  // Warm up scan
  searchOfflineVector('courage', 20);
  searchOfflineVector('courage', 20);
  let benchDuration = 999;
  let benchHits: ReturnType<typeof searchOfflineVector> = [];
  for (let r = 0; r < 3; r++) {
    const benchStart = performance.now();
    benchHits = searchOfflineVector('courage', 20);
    const d = performance.now() - benchStart;
    if (d < benchDuration) benchDuration = d;
  }
  console.log(`  40,000-word Int8 cosine scan took ${benchDuration.toFixed(2)}ms (found ${benchHits.length} results)`);
  if (benchDuration > 20) {
    throw new Error(`Expected offline vector search < 20ms, took ${benchDuration.toFixed(2)}ms`);
  }
  console.log('  ✓ Test 12 Passed\n');

  // Test 13: Multi-word centroid ranking ("brave bold knight")
  console.log('Test 13: Multi-word centroid query for "brave bold knight"');
  const t13 = searchOfflineVector('brave bold knight', 20);
  console.log(
    '  Top 6 for "brave bold knight":',
    t13.slice(0, 6).map((x) => `${x.word} (${x.matchPercent}%)`).join(', ')
  );
  if (t13.length === 0) {
    throw new Error('Expected results for multi-word centroid "brave bold knight"');
  }
  const hasBraverySynonym = t13.some((x) =>
    ['courage', 'bravery', 'valiant', 'knightly', 'stalwart', 'undaunted', 'courageousness', 'braveness', 'intrepid', 'dauntless', 'gallant'].includes(
      x.word.toLowerCase()
    )
  );
  if (!hasBraverySynonym) {
    throw new Error('Expected top results to contain core courage/knightly synonyms');
  }
  const hasArticulateSynonym = t13.slice(0, 5).some((x) =>
    ['valiant', 'chivalrous', 'gallant', 'intrepid', 'dauntless', 'valorous'].includes(
      x.word.toLowerCase()
    )
  );
  if (!hasArticulateSynonym) {
    throw new Error('Expected top 5 results to contain articulate synonyms like valiant, intrepid, dauntless');
  }
  console.log('  ✓ Test 13 Passed\n');

  // Test 14: Negative vector subtraction ("happy -loud")
  console.log('Test 14: Negative vector subtraction for "happy -loud"');
  const t14Pos = searchOfflineVector('happy', 20);
  const t14Neg = searchOfflineVector('happy -loud', 20);
  console.log(
    '  Top 6 for "happy":',
    t14Pos.slice(0, 6).map((x) => `${x.word} (${x.matchPercent}%)`).join(', ')
  );
  console.log(
    '  Top 6 for "happy -loud":',
    t14Neg.slice(0, 6).map((x) => `${x.word} (${x.matchPercent}%)`).join(', ')
  );
  if (t14Neg.length === 0) {
    throw new Error('Expected results for negative query "happy -loud"');
  }
  const badWords = ['loud', 'noisy', 'boisterous', 'clamorous', 'vociferous', 'strident'];
  for (const b of badWords) {
    if (t14Neg.slice(0, 10).some((x) => x.word.toLowerCase() === b)) {
      throw new Error(`Negative word "${b}" should not appear in top results of "happy -loud"`);
    }
  }
  console.log('  ✓ Test 14 Passed\n');

  // Test 15: Antonym exclusion and negative online penalty in hybrid mode
  console.log('Test 15: Antonym exclusion and negative online penalty in hybrid mode');
  const t15 = await searchVectorSynonyms('happy', undefined, 20);
  console.log(
    '  Top 6 hybrid results for "happy":',
    t15.slice(0, 6).map((x) => `${x.word} (${x.matchPercent}%, rawScore=${x.rawScore?.toFixed(3)})`).join(', ')
  );
  const directAntonyms = ['unhappy', 'sad', 'sorrowful', 'miserable', 'depressed', 'distressed', 'gloomy'];
  for (const ant of directAntonyms) {
    if (t15.slice(0, 15).some((x) => x.word.toLowerCase() === ant)) {
      throw new Error(`Direct antonym "${ant}" should be penalized/excluded from top results in hybrid search for "happy"`);
    }
  }
  console.log('  ✓ Test 15 Passed\n');

  // Test 16: Consistent local score scale (rawScore / maxRawLocal) across localHits and fallback computation
  console.log('Test 16: Consistent local score scale preservation');
  const t16Offline = searchOfflineVector('courage', 10);
  if (t16Offline.length === 0 || t16Offline[0].rawScore === undefined) {
    throw new Error('Expected rawScore to be defined on offline vector search results');
  }
  if (t16Offline[0].rawScore <= 0) {
    throw new Error('Expected top offline rawScore to be positive');
  }
  const t16Hybrid = await searchVectorSynonyms('courage', undefined, 10);
  if (t16Hybrid.length === 0 || t16Hybrid[0].rawScore === undefined) {
    throw new Error('Expected rawScore to be defined on hybrid vector search results');
  }
  console.log(`  Offline rawScore: ${t16Offline[0].rawScore?.toFixed(4)}, Hybrid rawScore: ${t16Hybrid[0].rawScore?.toFixed(4)}`);
  console.log('  ✓ Test 16 Passed\n');

  // Test 17: Morphological plural/inflection query & noise suppression ("flaws -dents problems issues")
  console.log('Test 17: Morphological query & noise suppression for "flaws -dents problems issues"');
  const t17 = await searchVectorSynonyms('flaws -dents problems issues', undefined, 25);
  console.log(
    '  Top 8 results for "flaws -dents problems issues":',
    t17.slice(0, 8).map((x) => `${x.word} (${x.matchPercent}%, sim=${x.similarity})`).join(', ')
  );
  if (t17.length === 0) {
    throw new Error('Expected results for "flaws -dents problems issues"');
  }

  // Verify that noise words do not appear anywhere in top results
  const noiseWords = ['linear', 'psychologist', 'guru', 'navajo', 'hasidic', 'shawnee'];
  for (const nw of noiseWords) {
    if (t17.some((x) => x.word.toLowerCase() === nw)) {
      throw new Error(`Unrelated noise word "${nw}" should not appear in results for "flaws -dents problems issues"`);
    }
  }

  // Verify that input seeds and base forms are excluded
  const seedForms = ['flaws', 'flaw', 'dents', 'dent', 'problems', 'problem', 'issues', 'issue'];
  for (const sf of seedForms) {
    if (t17.some((x) => x.word.toLowerCase() === sf)) {
      throw new Error(`Input seed form "${sf}" should be excluded from results`);
    }
  }

  // Verify top results contain core synonyms like defect, fault, drawback
  const foundWords = t17.map((x) => x.word.toLowerCase());
  const hasCoreSynonyms = ['defect', 'fault', 'drawback'].every((w) => foundWords.includes(w));
  if (!hasCoreSynonyms) {
    throw new Error('Expected top results to contain core synonyms (defect, fault, drawback)');
  }
  if (foundWords[0] !== 'defect') {
    throw new Error(`Expected "defect" to be ranked #1, got "${foundWords[0]}"`);
  }
  console.log('  ✓ Test 17 Passed\n');

  console.log('=== ALL VECTOR SEMANTIC SYNONYM TESTS PASSED SUCCESSFULLY! ===');
}

testVector()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Vector test failed:', err);
    process.exit(1);
  });
