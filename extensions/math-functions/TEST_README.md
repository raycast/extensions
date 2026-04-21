# Test Suite Documentation

This project includes a comprehensive test suite with 73 tests covering all non-standard math functions and expression parsing logic.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite includes:

### 1. **GCD (Greatest Common Divisor)** - 5 tests
- Positive numbers, zero handling, negative numbers
- Multiple arguments with `gcdMultiple`
- Edge cases (empty input, single value)

### 2. **LCM (Least Common Multiple)** - 5 tests
- Positive numbers, zero handling, negative numbers
- Multiple arguments with `lcmMultiple`
- Edge cases (empty input, single value)

### 3. **Statistical Functions** - 24 tests
- **sum**: Positive, negative, empty, single value
- **product**: Positive, negative, empty input
- **avg**: Average calculation, negative numbers, empty input
- **median**: Odd/even length arrays, unsorted input, edge cases
- **mode**: Most frequent value, equal frequency handling
- **range**: Max - min calculation, negative numbers
- **variance**: Population variance calculation
- **std**: Standard deviation (square root of variance)

### 4. **Factorial** - 3 tests
- Positive integers (0, 1, 5, 10)
- Error handling for negative numbers
- Large factorial calculations (up to 20!)

### 5. **Modulo** - 3 tests
- Standard modulo operation
- Negative number handling (follows JavaScript semantics)
- Zero handling

### 6. **isPrime** - 4 tests
- Prime number identification (2, 3, 5, 7, 11, 97)
- Non-prime identification (0, 1, 4, 6, 9, 100)
- Negative number handling
- Large prime testing (10007, 10009)

### 7. **Fibonacci** - 3 tests
- Standard Fibonacci sequence (0-10)
- Error handling for negative numbers
- Large Fibonacci numbers (up to fib(30))

### 8. **Combinations and Permutations** - 4 tests
- **ncr**: Combinations calculation, edge cases (r=0, r=n)
- **npr**: Permutations calculation
- Invalid input handling (r > n, r < 0)

### 9. **Angle Conversions** - 4 tests
- **deg2rad**: Degrees to radians conversion
- **rad2deg**: Radians to degrees conversion
- Negative angle handling for both

### 10. **Expression Completion Parser** - 18 tests
Critical for ensuring error-free parsing:

#### Trailing Operators (4 tests)
- Remove single trailing operators: `sum(5+` → `sum(5)`
- Remove multiple trailing operators: `sum(5,--+/*` → `sum(5)`
- Remove trailing commas: `sum(1,2,3,` → `sum(1,2,3)`
- Combined operator and comma removal

#### Parentheses Balancing (3 tests)
- Close unclosed parentheses: `sum(1,2,3` → `sum(1,2,3)`
- Handle nested unclosed parentheses
- Don't modify already balanced expressions

#### Complex Expressions (3 tests)
- Nested functions with trailing operators
- Multiple incomplete parts
- Preserve valid intermediate operators

#### Edge Cases (4 tests)
- Empty expressions
- Expression with only operators
- Whitespace handling
- Single function name without parentheses

#### Integration Tests (4 tests)
- Realistic user typing patterns (gradual input)
- Nested function typing patterns
- Mixed arithmetic and functions

## Why These Tests Matter

### Preventing Errors
The expression completion parser is critical because it prevents evaluation errors when users are typing. Without proper testing, incomplete expressions like `sum(5,` could cause runtime errors.

### Non-Standard Functions
Functions like `gcd`, `lcm`, `isPrime`, `fibonacci`, `ncr`, `npr` are custom implementations (not built into JavaScript's Math object), so thorough testing ensures correctness.

### Edge Cases
Many functions need to handle:
- Empty inputs (return sensible defaults like 0 or 1)
- Single values (should work without errors)
- Negative numbers (especially for `mod`, `gcd`, `lcm`)
- Invalid inputs (like `factorial(-5)` or `ncr(3, 5)`)

## Test Implementation

The tests are self-contained with duplicate function implementations to avoid dependencies on the main file. This ensures:
- Tests can run independently
- No risk of breaking tests when refactoring main code structure
- Clear documentation of expected behavior

## Future Improvements

Potential additions:
- Property-based testing for statistical functions
- Stress testing with very large inputs
- Floating-point precision tests
- Performance benchmarks integrated into tests
