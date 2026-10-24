import { searchWord, searchThesaurus } from '../src/services/dictionary-manager';
import { formatPhonetic } from '../src/services/pronunciation-service';
import { getWordSuggestions } from '../src/services/spell-check-service';
import { spellCheckOffline } from '../src/services/fast-wordnet-reader';
import { buildWordDetailMarkdown } from '../src/utils/ui-helpers';

async function runTests() {
  console.log('--- STARTING DICTIONARY & THESAURUS TESTS ---\n');

  // Test 1: formatPhonetic
  console.log('Test 1: CMU to IPA phonetic formatting');
  const sampleCmu = 'pron:HH AE1 P IY0 ';
  const formattedIpa = formatPhonetic(sampleCmu);
  console.log(`  CMU: "${sampleCmu}" -> IPA: "${formattedIpa}"`);
  if (!formattedIpa || !formattedIpa.includes('æ')) {
    throw new Error('Failed phonetic conversion');
  }
  console.log('  ✓ Test 1 Passed\n');

  // Test 2: Offline Word Lookup
  console.log('Test 2: Offline Word Lookup ("resilient")');
  const offlineResult = await searchWord('resilient', { offlineOnly: true });
  console.log(`  Word: ${offlineResult?.word}`);
  console.log(`  Source: ${offlineResult?.source}`);
  console.log(`  Meanings count: ${offlineResult?.meanings.length}`);
  if (offlineResult && offlineResult.meanings.length > 0) {
    const firstMeaning = offlineResult.meanings[0];
    console.log(`  Type (POS): ${firstMeaning.partOfSpeech}`);
    console.log(`  First definition: ${firstMeaning.definitions[0]}`);
    console.log(`  Synonyms found: ${firstMeaning.synonyms.length}`);
  } else {
    throw new Error('Offline lookup failed to find "resilient"');
  }
  console.log('  ✓ Test 2 Passed\n');

  // Test 3: Online Enrichment & Phonetics
  console.log('Test 3: Online Word Lookup ("serendipity")');
  const onlineResult = await searchWord('serendipity', { offlineOnly: false });
  console.log(`  Word: ${onlineResult?.word}`);
  console.log(`  Pronunciation: ${onlineResult?.phonetic}`);
  console.log(`  Syllables: ${onlineResult?.syllables}`);
  console.log(`  Source: ${onlineResult?.source}`);
  console.log(`  Meanings: ${onlineResult?.meanings.map((m) => m.partOfSpeech).join(', ')}`);
  if (!onlineResult || onlineResult.meanings.length === 0) {
    throw new Error('Online lookup failed for "serendipity"');
  }
  console.log('  ✓ Test 3 Passed\n');

  // Test 4: Thesaurus / Synonyms Command
  console.log('Test 4: Thesaurus Lookup ("happy")');
  const thesaurusResult = await searchThesaurus('happy', { offlineOnly: false });
  console.log(`  Target: ${thesaurusResult.targetWord}`);
  console.log(`  Synonyms count: ${thesaurusResult.synonyms.length}`);
  console.log(`  Antonyms count: ${thesaurusResult.antonyms.length}`);
  console.log(`  Top 5 synonyms: ${thesaurusResult.synonyms.slice(0, 5).map((s) => s.word).join(', ')}`);
  if (thesaurusResult.synonyms.length === 0) {
    throw new Error('Thesaurus lookup returned no synonyms');
  }
  console.log('  ✓ Test 4 Passed\n');

  // Test 5: Cache Verification
  console.log('Test 5: Cache Verification ("serendipity")');
  const cachedResult = await searchWord('serendipity');
  console.log(`  Source after caching: ${cachedResult?.source}`);
  if (cachedResult?.source !== 'cache') {
    throw new Error(`Expected source 'cache', got '${cachedResult?.source}'`);
  }
  console.log('  ✓ Test 5 Passed\n');

  // Test 6: Offline Thesaurus Lookup
  console.log('Test 6: Offline-Only Thesaurus Lookup ("happy")');
  const offlineThesaurus = await searchThesaurus('happy', { offlineOnly: true });
  console.log(`  Target: ${offlineThesaurus.targetWord}`);
  console.log(`  Offline synonyms count: ${offlineThesaurus.synonyms.length}`);
  console.log(`  Top 3 offline: ${offlineThesaurus.synonyms.slice(0, 3).map((s) => s.word).join(', ')}`);
  if (offlineThesaurus.synonyms.length === 0) {
    throw new Error('Offline thesaurus returned 0 synonyms');
  }
  console.log('  ✓ Test 6 Passed\n');

  // Test 7: Unknown word handling
  console.log('Test 7: Nonexistent word graceful fallback');
  const unknownResult = await searchWord('xyzzyqwertyfoobar123');
  console.log(`  Result for nonsense word: ${unknownResult}`);
  if (unknownResult !== null) {
    throw new Error('Expected null for nonexistent word');
  }
  console.log('  ✓ Test 7 Passed\n');

  // Test 8: Autocomplete prefix suggestions as word is being typed
  console.log('Test 8: Autocomplete suggestions as typed ("epist")');
  const t8 = await getWordSuggestions('epist');
  console.log(`  Completions count: ${t8.completions.length}`);
  console.log(`  Top completions: ${t8.completions.map((c) => c.word).slice(0, 4).join(', ')}`);
  if (!t8.completions.some((c) => c.word === 'epistemological')) {
    throw new Error('Expected "epistemological" in completions for "epist"');
  }
  console.log('  ✓ Test 8 Passed\n');

  // Test 9: Spell check on misspelled word ("epistemilogical")
  console.log('Test 9: Spell check suggestion for misspelled word ("epistemilogical")');
  const t9 = await getWordSuggestions('epistemilogical');
  console.log(`  Spelling suggestions count: ${t9.spellingSuggestions.length}`);
  console.log(`  Top spelling suggestions: ${t9.spellingSuggestions.map((s) => s.word).join(', ')}`);
  if (!t9.spellingSuggestions.some((s) => s.word === 'epistemological')) {
    throw new Error('Expected "epistemological" in spelling suggestions for "epistemilogical"');
  }
  console.log('  ✓ Test 9 Passed\n');

  // Test 10: Offline spell check ("resiliant")
  console.log('Test 10: Offline spell check ("resiliant")');
  const t10 = spellCheckOffline('resiliant');
  console.log(`  Offline suggestions for "resiliant": ${t10.join(', ')}`);
  if (!t10.includes('resilient')) {
    throw new Error('Expected "resilient" in offline spell check for "resiliant"');
  }
  console.log('  ✓ Test 10 Passed\n');

  // Test 11: Exact match prioritization over spell check ("happy")
  console.log('Test 11: Exact match priority over spell check ("happy")');
  const t11 = await getWordSuggestions('happy');
  console.log(`  Exact match: ${t11.exactMatch?.word}`);
  console.log(`  Spelling suggestions count: ${t11.spellingSuggestions.length}`);
  if (!t11.exactMatch || t11.exactMatch.word !== 'happy') {
    throw new Error('Expected exact match for "happy"');
  }
  if (t11.spellingSuggestions.length > 0) {
    throw new Error('Expected 0 spelling suggestions for valid exact match "happy"');
  }
  // Test 12: Clickable Synonyms & Antonyms in Detail Markdown (no browser tabs, raycast:// deeplinks)
  console.log('Test 12: Clickable synonyms & antonyms in Detail markdown');
  if (!offlineResult) throw new Error('offlineResult is null');
  const detailMd = buildWordDetailMarkdown(offlineResult, ['tough', 'strong'], ['fragile']);
  console.log('  Sample Markdown output snippet:\n  ' + detailMd.split('\n').slice(0, 10).join('\n  '));
  if (!detailMd.includes('![tough](') || !detailMd.includes('/def?fallbackText=tough')) {
    throw new Error('Expected clickable markdown badge link for synonym "tough"');
  }
  if (!detailMd.includes('![fragile](') || !detailMd.includes('/def?fallbackText=fragile')) {
    throw new Error('Expected clickable markdown badge link for antonym "fragile"');
  }
  // Test 13: Top 3 Vector Synonyms, Background Audio Pronunciation, Clean Flush Top
  console.log('Test 13: Vector green badges, audio link, flush top, no instruction text');
  const dummyResult: any = {
    word: 'resilient',
    phonetic: '/rɪˈzɪliənt/',
    meanings: [{ partOfSpeech: 'adjective', definitions: ['elastic; rebounds readily'], examples: [] }],
    source: 'offline',
  };
  const enrichedMd = buildWordDetailMarkdown(
    dummyResult,
    ['tenacious', 'tough'],
    ['brittle'],
    undefined,
    ['buoyant', 'springy', 'supple', 'elastic']
  );

  // 1. Must start flush with # RESILIENT (no blank lines or top HTML <p>)
  if (!enrichedMd.startsWith('# RESILIENT')) {
    throw new Error('Expected markdown to start flush with # RESILIENT');
  }

  // 2. Clickable background pronunciation link without browser
  if (!enrichedMd.includes('[/rɪˈzɪliənt/ 🔊](raycast://extensions/johnathan_w/oxford-dictionary/pronounce?arguments=')) {
    throw new Error('Expected background raycast:// pronunciation link');
  }

  // 3. Top 3 vector synonyms (buoyant, springy, supple) present ahead of standard synonyms
  if (!enrichedMd.includes('![buoyant](') || !enrichedMd.includes('![springy](') || !enrichedMd.includes('![supple](')) {
    throw new Error('Expected top 3 vector synonyms to be present');
  }
  // 4th vector synonym should not be in top 3
  if (enrichedMd.includes('![elastic](')) {
    throw new Error('Expected vector synonyms to be capped at top 3');
  }

  // 4. No "Use arrow keys..." text
  if (enrichedMd.toLowerCase().includes('use arrow keys')) {
    throw new Error('Expected "Use arrow keys..." instruction text to be eliminated');
  }

  console.log('  ✓ Test 13 Passed\n');

  // Test 14: Online and Cached Online results are NOT labeled offline
  console.log('Test 14: Online and Cached Online results are NOT marked offline');
  const onlineWord = await searchWord('serendipity');
  if (!onlineWord) throw new Error('Expected serendipity word result');
  const onlineMd = buildWordDetailMarkdown(onlineWord);
  if (onlineMd.includes('offline')) {
    throw new Error('Online or cached online result for "serendipity" should NOT be labeled offline');
  }

  // Look up a cached online word and verify it still is not labeled offline
  const cachedOnline = await searchWord('serendipity');
  if (!cachedOnline || cachedOnline.source !== 'cache') {
    throw new Error('Expected cached serendipity result');
  }
  const cachedMd = buildWordDetailMarkdown(cachedOnline);
  if (cachedMd.includes('offline')) {
    throw new Error('Cached online result should NOT be labeled offline');
  }
  console.log('  ✓ Test 14 Passed\n');

  console.log('=== ALL 14 TESTS PASSED SUCCESSFULLY! ===');
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  });
