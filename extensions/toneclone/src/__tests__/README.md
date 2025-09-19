# ToneClone Raycast Plugin Test Suite

This directory contains comprehensive unit tests for the ToneClone Raycast plugin, focusing on testing critical paths and business logic identified in code review feedback.

## Test Structure

### Core Test Files

- **`setup.ts`** - Jest test setup and global mocks
- **`test-utils.ts`** - Shared test utilities, mocks, and fixtures
- **`api.test.ts`** - API client tests (authentication, error handling, timeouts, URL validation)
- **`preferences.test.ts`** - Preference management tests (saving/loading, type safety)
- **`input-validation.test.ts`** - Input validation tests for generate-text component
- **`file-validation.test.ts`** - File upload validation tests (size limits, type validation, async reading)
- **`error-handling.test.ts`** - Error handling scenarios and edge cases
- **`types.test.ts`** - Type definitions and constants validation

## Test Coverage Areas

### 1. API Client (`api.test.ts`)

- ✅ Constructor validation and URL handling
- ✅ Authentication header inclusion
- ✅ HTTP error response handling
- ✅ Network timeout scenarios
- ✅ Request/response parsing
- ✅ All API method coverage
- ✅ File upload special handling

### 2. Preference Management (`preferences.test.ts`)

- ✅ LocalStorage save/load operations
- ✅ JSON parsing error handling
- ✅ Type safety for preference values
- ✅ Concurrent operation handling
- ✅ Storage quota and access errors
- ✅ Data corruption recovery

### 3. Input Validation (`input-validation.test.ts`)

- ✅ Required field validation (persona, prompt)
- ✅ Formality level validation (1-10 range)
- ✅ Reading level validation (1-16 range)
- ✅ Target length validation (positive numbers)
- ✅ Numeric input edge cases
- ✅ Special character handling

### 4. File Upload Validation (`file-validation.test.ts`)

- ✅ File type validation (allowed extensions)
- ✅ File size limits (10MB maximum)
- ✅ Async file reading operations
- ✅ File corruption handling
- ✅ Binary and text content support
- ✅ Complex filename handling

### 5. Error Handling (`error-handling.test.ts`)

- ✅ HTTP status code handling (401, 403, 404, 429, 500+)
- ✅ Network connectivity issues
- ✅ Data validation failures
- ✅ Authentication/authorization errors
- ✅ Concurrent operation failures
- ✅ Recovery mechanisms

### 6. Types and Constants (`types.test.ts`)

- ✅ Constant value validation
- ✅ Type interface compatibility
- ✅ Optional vs required fields
- ✅ Array and object type safety
- ✅ Default value ranges

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Specific Test Files

```bash
# Run API tests only
npm test api.test.ts

# Run preference tests only
npm test preferences.test.ts

# Run validation tests
npm test input-validation.test.ts
npm test file-validation.test.ts
```

### Debug Mode

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test pattern
npm test -- --testNamePattern="API Client"
```

## Test Philosophy

### Production-Critical Focus

Tests prioritize functionality that directly impacts user experience:

- Authentication and API connectivity
- Input validation preventing errors
- File handling preventing data loss
- Error recovery and graceful degradation

### Comprehensive Edge Case Coverage

- Network failure scenarios
- Malformed data handling
- Boundary value testing
- Concurrent operation safety

### Regression Prevention

Tests specifically guard against issues identified in code reviews:

- Input validation bypasses
- File upload corruption
- Preference data loss
- API timeout handling

## Mock Strategy

### Raycast API Mocking

- Complete mock of `@raycast/api` module
- LocalStorage simulation
- Toast notification tracking
- Clipboard operation verification

### Network Request Mocking

- Fetch API mocking with custom responses
- Timeout simulation
- Error condition reproduction
- Response format validation

### File System Mocking

- fs.promises mocking for file operations
- Buffer creation utilities
- File size and type simulation
- Error condition testing

## Coverage Goals

The test suite aims for:

- **90%+ line coverage** on critical business logic
- **100% coverage** on input validation functions
- **100% coverage** on error handling paths
- **Complete scenario coverage** for user-facing operations

## Maintenance

### Adding New Tests

1. Follow existing test structure and naming
2. Use shared utilities from `test-utils.ts`
3. Include both happy path and error scenarios
4. Add edge case coverage for boundary conditions

### Updating Mocks

1. Keep mocks in sync with actual API changes
2. Update type definitions when interfaces change
3. Maintain realistic mock data
4. Test mock accuracy against real responses

### Performance Considerations

- Tests run in parallel where possible
- Mocks avoid actual network calls
- File operations use small test data
- Timeout values are test-appropriate

## Known Limitations

1. **React Component Testing**: Currently focuses on business logic rather than UI rendering
2. **Integration Testing**: Limited integration test coverage (by design - unit tests focus)
3. **Browser-Specific Features**: Some Raycast-specific features can't be fully tested in Jest environment

## Future Enhancements

Potential test suite improvements:

- Visual regression testing for UI components
- End-to-end test scenarios
- Performance benchmarking
- Accessibility testing
- Real API integration tests (separate from unit tests)
