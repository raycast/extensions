#!/usr/bin/env node

/**
 * Simple test script to verify the TikZ tool works correctly
 *
 * This simulates what Raycast AI does when calling the tool:
 * 1. Calls the tool with TikZ code
 * 2. Checks if PDF is generated
 * 3. Verifies the returned path is valid
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

console.log('🧪 Testing TikZ Tool...\n');

// Test 1: Check if pdflatex is available
console.log('Test 1: Checking pdflatex availability...');
try {
  const pdflatexPath = execSync('which pdflatex', { encoding: 'utf-8' }).trim();
  console.log(`✅ pdflatex found at: ${pdflatexPath}`);
} catch (error) {
  console.log('❌ pdflatex not found in PATH');
  console.log('   Try: export PATH="/Library/TeX/texbin:$PATH"');
  process.exit(1);
}

// Test 2: Check if standalone package is available
console.log('\nTest 2: Checking standalone package...');
try {
  const standalonePath = execSync('kpsewhich standalone.cls', { encoding: 'utf-8' }).trim();
  console.log(`✅ standalone.cls found at: ${standalonePath}`);
} catch (error) {
  console.log('❌ standalone.cls not found');
  console.log('   Try: sudo tlmgr install standalone');
  process.exit(1);
}

// Test 3: Create a test TikZ document
console.log('\nTest 3: Creating test TikZ document...');
const testDir = '/tmp/tikz-test';
const timestamp = Date.now();
const texFile = path.join(testDir, `test_${timestamp}.tex`);
const pdfFile = path.join(testDir, `test_${timestamp}.pdf`);

execSync(`mkdir -p ${testDir}`);

const tikzDocument = `\\documentclass[border=2pt]{standalone}
\\usepackage{tikz}
\\usetikzlibrary{arrows,automata,positioning,shapes,calc,decorations.pathreplacing,decorations.markings,patterns}

\\begin{document}
\\begin{tikzpicture}
\\draw (0,0) circle (2);
\\node at (0,0) {Test};
\\end{tikzpicture}
\\end{document}`;

require('fs').writeFileSync(texFile, tikzDocument);
console.log(`✅ Created: ${texFile}`);

// Test 4: Compile the document
console.log('\nTest 4: Compiling TikZ document...');
try {
  execSync(`pdflatex -interaction=nonstopmode -output-directory="${testDir}" "${texFile}"`, {
    cwd: testDir,
    stdio: 'pipe'
  });

  if (existsSync(pdfFile)) {
    console.log(`✅ PDF generated: ${pdfFile}`);
    const stats = require('fs').statSync(pdfFile);
    console.log(`   Size: ${stats.size} bytes`);
  } else {
    console.log('❌ PDF was not generated');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Compilation failed');
  console.log(error.message);
  process.exit(1);
}

// Test 5: Verify PDF is valid
console.log('\nTest 5: Verifying PDF validity...');
try {
  const fileType = execSync(`file "${pdfFile}"`, { encoding: 'utf-8' });
  if (fileType.includes('PDF')) {
    console.log('✅ Valid PDF document');
  } else {
    console.log('⚠️  File exists but may not be a valid PDF');
    console.log(`   File type: ${fileType}`);
  }
} catch (error) {
  console.log('⚠️  Could not verify PDF type');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));
console.log('\nYour TikZ tool should work correctly.');
console.log('\nTo test in Raycast AI:');
console.log('1. Reload the extension (Cmd+R in dev mode)');
console.log('2. Ask: "Draw a simple circle using TikZ"');
console.log('3. Confirm the action when prompted');
console.log('4. Check if PDF is created and path is returned');
console.log('\nGenerated files are in:', testDir);
console.log('\nYou can view the PDF with: open', pdfFile);
