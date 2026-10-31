import { searchReverseDefinitions, searchOfflineReverse } from '../src/services/reverse-search-service';

async function testReverse() {
  console.log('--- STARTING REVERSE DEFINITION SEARCH TESTS ---\n');

  // Test 1: "to put forward"
  console.log('Test 1: Reverse search for "to put forward"');
  const t1 = await searchReverseDefinitions('to put forward');
  console.log('  Top 8 results:', t1.slice(0, 8).map((x) => `${x.word} (${x.partOfSpeech})`).join(', '));
  const expectedPutForward = ['propose', 'suggest', 'submit', 'propound', 'nominate', 'advocate', 'raise'];
  const hasPutForward = t1.some((x) => expectedPutForward.includes(x.word.toLowerCase()));
  if (!hasPutForward) {
    throw new Error('Expected "to put forward" to match one of: ' + expectedPutForward.join(', '));
  }
  console.log('  ✓ Test 1 Passed\n');

  // Test 2: "fear of spiders"
  console.log('Test 2: Reverse search for "fear of spiders"');
  const t2 = await searchReverseDefinitions('fear of spiders');
  console.log('  Top 5 results:', t2.slice(0, 5).map((x) => `${x.word} (${x.partOfSpeech})`).join(', '));
  if (!t2.some((x) => x.word.toLowerCase().includes('arachnophobia') || x.word.toLowerCase().includes('phobia'))) {
    throw new Error('Expected "fear of spiders" to match arachnophobia');
  }
  console.log('  ✓ Test 2 Passed\n');

  // Test 3: "study of knowledge"
  console.log('Test 3: Reverse search for "study of knowledge"');
  const t3 = await searchReverseDefinitions('study of knowledge');
  console.log('  Top 5 results:', t3.slice(0, 5).map((x) => `${x.word} (${x.partOfSpeech})`).join(', '));
  if (!t3.some((x) => x.word.toLowerCase() === 'epistemology' || x.word.toLowerCase() === 'gnosiology')) {
    throw new Error('Expected "study of knowledge" to match epistemology or gnosiology');
  }
  console.log('  ✓ Test 3 Passed\n');

  // Test 4: Offline search for "put forward"
  console.log('Test 4: Offline WordNet gloss search for "put forward"');
  const t4 = await searchOfflineReverse('put forward');
  console.log('  Offline results count:', t4.length);
  console.log('  Top 5 offline results:', t4.slice(0, 5).map((x) => `${x.word}: "${x.definition?.slice(0, 50)}..."`).join('\n    '));
  if (t4.length === 0 || !t4.some((x) => ['propound', 'offer', 'propose', 'nominate', 'raise', 'bring up'].includes(x.word.toLowerCase()))) {
    throw new Error('Expected offline search to find WordNet gloss matches for "put forward"');
  }
  console.log('  ✓ Test 4 Passed\n');

  // Test 5: Cache verification
  console.log('Test 5: In-memory cache verification');
  const start = Date.now();
  const cached = await searchReverseDefinitions('to put forward');
  const elapsed = Date.now() - start;
  console.log(`  Cached lookup took ${elapsed}ms for ${cached.length} items`);
  if (elapsed > 10) {
    throw new Error(`Expected cache retrieval < 10ms, took ${elapsed}ms`);
  }
  console.log('  ✓ Test 5 Passed\n');

  // Test 6: Empty query handling
  console.log('Test 6: Empty query handling');
  const emptyRes = await searchReverseDefinitions('   ');
  if (emptyRes.length !== 0) {
    throw new Error('Expected empty array for empty query');
  }
  console.log('  ✓ Test 6 Passed\n');

  console.log('=== ALL REVERSE SEARCH TESTS PASSED SUCCESSFULLY! ===');
}

testReverse()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Reverse test failed:', err);
    process.exit(1);
  });
