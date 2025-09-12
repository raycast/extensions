# WordCalc Tests

This directory contains comprehensive tests for the WordCalc Raycast extension.

## Test Coverage

Our test suite covers all core utility functions with **100% function and line coverage**:

- ✅ **Text Cleaning** - HTML/Markdown removal, normalization
- ✅ **Paragraph Counting** - HTML, Markdown, and plain text detection
- ✅ **Time Formatting** - Reading/speaking time calculations
- ✅ **Text Analysis** - Word count, character count, comprehensive analysis
- ✅ **Time Estimates** - WPM-based reading and speaking time calculations

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Results Summary

✅ **33/33 tests passing**  
✅ **100% function coverage**  
✅ **100% line coverage**  
✅ **84.21% branch coverage**  

## Test Structure

### `utils.test.ts`
Comprehensive tests for all utility functions:

#### `cleanTextForWordCount()`
- HTML tag removal
- Markdown formatting cleanup
- URL and email removal
- Whitespace normalization
- Complex mixed content handling

#### `countParagraphs()`
- HTML paragraph detection
- Markdown paragraph counting
- Plain text paragraph analysis
- Edge case handling (empty, whitespace, short content)

#### `formatTime()`
- Seconds formatting
- Minutes formatting
- Mixed minutes/seconds display
- Edge case handling

#### `analyzeTextStatic()`
- Word counting accuracy
- Character count (with/without spaces)
- Paragraph detection integration
- Complex content analysis

#### `calculateTimeEstimates()`
- Reading time calculations
- Speaking time calculations
- Various word counts (small, large, zero)
- WPM-based accuracy

## Test Philosophy

Our tests focus on:

1. **Accuracy** - Ensuring word counts and time estimates are correct
2. **Robustness** - Handling edge cases and malformed input
3. **Real-world usage** - Testing with actual HTML, Markdown, and mixed content
4. **Performance** - Validating efficiency of text processing algorithms

## Future Test Enhancements

Potential areas for additional testing:
- Integration tests for UI components (requires Raycast API mocking)
- Performance benchmarks for large documents
- Accessibility testing for form validation
- Cross-platform text encoding tests
