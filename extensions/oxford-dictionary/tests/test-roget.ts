import {
  getRogetClasses,
  getRogetEntry,
  getRogetSection,
  searchRoget,
  formatRogetMarkdown,
  extractCrossReferences,
} from '../src/services/roget-service';

async function testRoget() {
  console.log('--- TESTING ROGET THESAURUS SERVICE ---');

  // 1. Classes test
  const classes = getRogetClasses();
  console.log('Classes count:', classes.length);
  if (classes.length !== 6) throw new Error(`Expected 6 classes, got ${classes.length}`);
  console.log('  ✓ Classes test passed');

  // 2. Entry 861 (Courage)
  const e861 = getRogetEntry(861);
  if (!e861 || e861.title !== 'Courage') throw new Error('Failed to find entry 861 Courage');
  console.log('  Entry 861 found:', e861.title, `(${e861.classLabel})`);
  console.log('  ✓ Entry 861 test passed');

  // 3. Entry 1 (Existence) and Entry 1000 (Temple)
  const e1 = getRogetEntry(1);
  const e1000 = getRogetEntry(1000);
  if (!e1 || !e1000) throw new Error('Missing entry 1 or 1000');
  if (e1000.body.includes('*** END OF THE PROJECT GUTENBERG')) {
    throw new Error('Entry 1000 still contains Gutenberg trailing text');
  }
  console.log('  Entry 1:', e1.title);
  console.log('  Entry 1000:', e1000.title);
  console.log('  ✓ Boundary entries test passed');

  // 4. Section navigation
  const sec = getRogetSection(1, 'I');
  if (!sec || sec.entries.length !== 8) {
    throw new Error(`Expected 8 entries in Class 1 Section I, got ${sec?.entries.length}`);
  }
  console.log('  Class 1 Section I entries count:', sec.entries.length);
  console.log('  ✓ Section navigation test passed');

  // 5. Numeric Search
  const numHits = searchRoget('861');
  if (numHits.length === 0 || numHits[0].entry.id !== 861) {
    throw new Error('Failed numeric search for 861');
  }
  console.log('  Numeric search for 861 returned:', numHits[0].entry.title);
  console.log('  ✓ Numeric search test passed');

  // 6. Word Search
  const wordHits = searchRoget('courage');
  if (wordHits.length === 0 || wordHits[0].entry.title !== 'Courage') {
    throw new Error('Failed word search for courage');
  }
  console.log('  Word search for "courage" top hit:', wordHits[0].entry.id, wordHits[0].entry.title);
  console.log('  Total hits for courage:', wordHits.length);
  console.log('  ✓ Word search test passed');

  // 7. Cross-references and Markdown formatting
  const refs = extractCrossReferences(e861);
  console.log('  Cross references for Courage (861):', refs);
  const md = formatRogetMarkdown(e861);
  if (!md.includes('### Nouns (N.)') || !md.includes('rrthesaurus.com')) {
    throw new Error('Markdown formatting failed');
  }
  // Verify words are linkified as plain markdown links to def
  if (!md.includes('![courage](') || !md.includes('/def?fallbackText=courage')) {
    throw new Error('Expected word "courage" to be clickable badge link to def');
  }
  if (!md.includes('![bravery](') || !md.includes('/def?fallbackText=bravery')) {
    throw new Error('Expected word "bravery" to be clickable badge link to def');
  }
  // Verify category numbers are linkified to roget
  if (!md.includes('/roget?fallbackText=1')) {
    throw new Error('Expected category number "1" to be clickable link to roget');
  }
  // Verify title word is clickable link cycling to next consecutive entry
  if (!md.includes('[COURAGE](raycast://extensions/johnathan_w/oxford-dictionary/roget?fallbackText=862)')) {
    throw new Error('Expected title word COURAGE to be clickable link to next entry 862');
  }
  // Verify navigation arrows are clickable links
  if (!md.includes('[← **860. Fear**]')) {
    throw new Error('Expected previous navigation link for 860. Fear');
  }
  if (!md.includes('[**862. Cowardice** →]')) {
    throw new Error('Expected next navigation link for 862. Cowardice');
  }
  console.log('  ✓ Markdown formatting with clickable title and consecutive navigation links passed');

  console.log('\n=== ALL ROGET TESTS PASSED! ===');
}

testRoget()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
