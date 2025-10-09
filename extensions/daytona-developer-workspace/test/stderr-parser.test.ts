/**
 * Task 8.3: stderr Parser Tests
 * Comprehensive test cases for the stderr parser implementation
 */

import { parseStderr, parseStderrEnhanced, extractErrorSummary } from '../src/lib/stderr-parser';

// Test data based on documented patterns from Task 8.1

const testCases = {
  nameError: `Traceback (most recent call last):
  File "<stdin>", line 2, in <module>
NameError: name 'undefined_variable' is not defined`,

  typeError: `Traceback (most recent call last):
  File "<stdin>", line 2, in <module>
TypeError: object of type 'int' has no len()`,

  multiLevelStack: `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "<stdin>", line 6, in level_one
  File "<stdin>", line 3, in level_two
  File "<stdin>", line 1, in level_three
NameError: name 'nonexistent_var' is not defined`,

  indentationError: `  File "<stdin>", line 2
    print("Wrong indentation")
    ^
IndentationError: expected an indented block`,

  syntaxError: `  File "<stdin>", line 1
    if True
           ^
SyntaxError: invalid syntax`,

  zeroDivisionError: `Traceback (most recent call last):
  File "<stdin>", line 2, in <module>
ZeroDivisionError: division by zero`,

  importError: `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ImportError: No module named 'nonexistent_module'`
};

/**
 * Run all parser tests
 */
function runParserTests() {
  console.log('🧪 Starting stderr Parser Tests (Task 8.3)...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: NameError parsing
  console.log('Test 1: NameError parsing');
  const nameErrorResult = parseStderr(testCases.nameError, { includeSuggestions: true });
  if (nameErrorResult.success) {
    const error = nameErrorResult.error;
    console.log(`✅ Parsed as ${error.errorType}: ${error.message}`);
    console.log(`   Stack frames: ${error.stackFrames.length}`);
    console.log(`   Has traceback: ${error.hasTraceback}`);
    console.log(`   Suggestions: ${error.suggestions?.length || 0}`);
    passed++;
  } else {
    console.log(`❌ Failed: ${nameErrorResult.reason}`);
    failed++;
  }

  // Test 2: Multi-level stack trace
  console.log('\nTest 2: Multi-level stack trace');
  const stackResult = parseStderr(testCases.multiLevelStack);
  if (stackResult.success) {
    const error = stackResult.error;
    console.log(`✅ Parsed ${error.stackFrames.length} stack frames`);
    error.stackFrames.forEach((frame, i) => {
      console.log(`   Frame ${i}: ${frame.file}:${frame.line} in ${frame.functionName || '<module>'}`);
    });
    passed++;
  } else {
    console.log(`❌ Failed: ${stackResult.reason}`);
    failed++;
  }

  // Test 3: Syntax error (no traceback)
  console.log('\nTest 3: IndentationError (syntax error)');
  const syntaxResult = parseStderr(testCases.indentationError, { includeContext: true });
  if (syntaxResult.success) {
    const error = syntaxResult.error;
    console.log(`✅ Parsed as ${error.errorType}: ${error.message}`);
    console.log(`   Has traceback: ${error.hasTraceback}`);
    console.log(`   Syntax context: ${error.syntaxContext?.line}`);
    console.log(`   Caret position: ${error.syntaxContext?.position}`);
    passed++;
  } else {
    console.log(`❌ Failed: ${syntaxResult.reason}`);
    failed++;
  }

  // Test 4: Enhanced parser with categorization
  console.log('\nTest 4: Enhanced parser with categorization');
  const enhancedResult = parseStderrEnhanced(testCases.typeError);
  if (enhancedResult.success) {
    console.log(`✅ Categorized as: ${enhancedResult.category}`);
    console.log(`   Error type: ${enhancedResult.error.errorType}`);
    passed++;
  } else {
    console.log(`❌ Enhanced parsing failed: ${enhancedResult.reason}`);
    failed++;
  }

  // Test 5: Error summary extraction
  console.log('\nTest 5: Quick error summary extraction');
  const summary = extractErrorSummary(testCases.zeroDivisionError);
  if (summary) {
    console.log(`✅ Summary: ${summary.type} - ${summary.message}`);
    passed++;
  } else {
    console.log('❌ Failed to extract summary');
    failed++;
  }

  // Test 6: Edge cases
  console.log('\nTest 6: Edge cases');
  const emptyResult = parseStderr('');
  const invalidResult = parseStderr('Some random text that is not an error');
  
  console.log(`   Empty stderr: success=${emptyResult.success}, reason="${emptyResult.success ? 'none' : emptyResult.reason}"`);
  console.log(`   Invalid stderr: success=${invalidResult.success}, reason="${invalidResult.success ? 'none' : invalidResult.reason}"`);
  
  if (!emptyResult.success && !invalidResult.success) {
    console.log('✅ Correctly handled edge cases');
    passed++;
  } else {
    console.log('❌ Edge case handling failed');
    failed++;
  }

  // Results summary
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Task 8.3 parser implementation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Parser needs refinement.');
  }

  return { passed, failed, total: passed + failed };
}

// Export test cases for external use
export { testCases, runParserTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runParserTests();
}