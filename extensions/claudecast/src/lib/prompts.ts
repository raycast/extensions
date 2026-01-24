import { LocalStorage, Icon, Color } from "@raycast/api";
import { randomUUID } from "crypto";

export type PromptCategory =
  | "planning"
  | "tdd"
  | "review"
  | "refactoring"
  | "debugging"
  | "docs"
  | "advanced";

export interface PromptVariable {
  name: string;
  description: string;
  default?: string;
  type?: "text" | "code" | "selection" | "path";
  /** For code variables: allow user to specify a repository path instead of pasting code */
  allowRepositoryPath?: boolean;
  /** For path variables: whether to allow directory selection (default: true) */
  allowDirectories?: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  description: string;
  prompt: string;
  variables: PromptVariable[];
  systemPrompt?: string;
  model?: "sonnet" | "opus" | "haiku";
  usageCount: number;
  isBuiltIn: boolean;
  icon?: Icon;
  tintColor?: Color;
}

const CUSTOM_PROMPTS_KEY = "claudecast-custom-prompts";
const PROMPT_USAGE_KEY = "claudecast-prompt-usage";

// Built-in curated prompts
export const BUILT_IN_PROMPTS: PromptTemplate[] = [
  // Planning & Architecture
  {
    id: "spec-driven-planning",
    name: "Spec-Driven Planning",
    category: "planning",
    description: "Create a detailed spec before writing code",
    prompt: `You are a senior software architect creating a comprehensive specification for {{feature}}.{{#if projectPath}}

Project location: {{projectPath}}{{/if}}

Create a detailed specification document covering:

## 1. Executive Summary
- One-paragraph description of the feature
- Primary user benefit and business value

## 2. Functional Requirements
- **User Stories**: As a [user], I want [goal] so that [benefit]
- **Acceptance Criteria**: Specific, testable conditions for each requirement
- **Priority**: Must-have vs nice-to-have features

## 3. Technical Requirements
- **Performance**: Response times, throughput, resource limits
- **Scalability**: Expected load, growth projections
- **Security**: Authentication, authorization, data protection needs
- **Compatibility**: Browser/platform support, API versions

## 4. Data Model
- **Entities**: Key data structures with fields and types
- **Relationships**: How entities connect (1:1, 1:N, N:N)
- **Validation Rules**: Constraints and business rules
- **Migration Strategy**: How to handle existing data

## 5. API Contracts
- **Endpoints**: URLs, methods, request/response schemas
- **Error Handling**: Error codes, messages, retry behavior
- **Versioning**: How API changes will be managed

## 6. Edge Cases & Error Handling
- **Input Validation**: Invalid, missing, malformed data
- **State Transitions**: Invalid state changes, race conditions
- **External Failures**: Network issues, service unavailability
- **Resource Limits**: Memory, storage, rate limits

## 7. Testing Strategy
- **Unit Tests**: Key functions to test in isolation
- **Integration Tests**: Component interaction scenarios
- **E2E Tests**: Critical user journeys
- **Performance Tests**: Load and stress test scenarios

## 8. Risk Assessment
- **Technical Risks**: Complex integrations, new technologies
- **Dependencies**: External services, third-party libraries
- **Mitigation**: Fallback plans and contingencies

Be thorough but practical. Focus on decisions that will affect implementation. Flag any ambiguities that need clarification before coding begins.`,
    variables: [
      { name: "feature", description: "The feature to plan", type: "text" },
      {
        name: "projectPath",
        description: "Path to create the new project (optional)",
        type: "path",
        allowDirectories: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Document,
    tintColor: Color.Blue,
  },
  {
    id: "architecture-review",
    name: "Architecture Review",
    category: "planning",
    description: "Review and suggest improvements to component architecture",
    prompt: `You are a senior software architect conducting a comprehensive architecture review of {{component}}.

Analyze the architecture across these dimensions:

## 1. SOLID Principles Assessment
- **Single Responsibility**: Does each module have one reason to change?
- **Open/Closed**: Can behavior be extended without modification?
- **Liskov Substitution**: Can subtypes substitute base types safely?
- **Interface Segregation**: Are interfaces focused and minimal?
- **Dependency Inversion**: Do high-level modules depend on abstractions?

## 2. Separation of Concerns
- **Layer Boundaries**: Are presentation, business logic, and data access separated?
- **Cross-Cutting Concerns**: How are logging, auth, caching handled?
- **Responsibility Distribution**: Is any component doing too much?

## 3. Coupling & Cohesion Analysis
- **Afferent Coupling**: How many modules depend on this component?
- **Efferent Coupling**: How many dependencies does this component have?
- **Cohesion Score**: Do related functions stay together?
- **Circular Dependencies**: Are there any dependency cycles?

## 4. Scalability Assessment
- **Horizontal Scaling**: Can this scale across multiple instances?
- **Bottlenecks**: What are the limiting factors for throughput?
- **State Management**: How is state handled across instances?
- **Async Patterns**: Are long-running operations non-blocking?

## 5. Testability Analysis
- **Dependency Injection**: Can dependencies be mocked/stubbed?
- **Pure Functions**: Are there side-effect-free functions to test?
- **Integration Seams**: Where can tests intercept behavior?
- **Test Data**: Can test scenarios be set up easily?

## 6. Maintainability Factors
- **Code Navigation**: Can developers find relevant code quickly?
- **Change Impact**: How far do changes ripple?
- **Documentation**: Is the architecture self-documenting?
- **Onboarding**: How long to understand the architecture?

## 7. Security Architecture
- **Attack Surface**: What entry points exist?
- **Trust Boundaries**: Where does trusted/untrusted code meet?
- **Data Flow**: Where does sensitive data travel?
- **Failure Modes**: What happens when security checks fail?

For each issue found, provide:
1. **Problem**: Clear description of the architectural concern
2. **Impact**: How this affects the system (scale: Low/Medium/High/Critical)
3. **Recommendation**: Specific, actionable improvement with code example
4. **Effort Estimate**: Rough complexity (Small/Medium/Large)

Prioritize recommendations by impact-to-effort ratio.`,
    variables: [
      {
        name: "component",
        description: "Component or module to review",
        type: "text",
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Building,
    tintColor: Color.Purple,
  },

  // Test-Driven Development
  {
    id: "tdd-kickoff",
    name: "TDD Kickoff",
    category: "tdd",
    description: "Start TDD by writing failing tests first",
    prompt: `You are a test-driven development expert. We're implementing {{feature}} using strict TDD methodology.

Expected behaviors:
{{behaviors}}

## Your Task
Write comprehensive failing tests BEFORE any implementation code.

## Testing Pyramid Strategy
Structure tests across the pyramid:

### 1. Unit Tests (70% of tests)
- Test individual functions in isolation
- Mock all external dependencies
- Fast execution (< 10ms per test)
- Cover all code paths

### 2. Integration Tests (20% of tests)
- Test component interactions
- Use real dependencies where practical
- Test API contracts between modules

### 3. E2E Tests (10% of tests)
- Test critical user journeys
- Verify system works end-to-end

## Test Writing Guidelines

### Naming Convention
Use: \`describe [unit] when [condition] should [expected behavior]\`
Example: \`describe UserService when email is invalid should throw ValidationError\`

### AAA Pattern
Structure each test as:
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code under test
- **Assert**: Verify the expected outcome

### Coverage Requirements
For each behavior, write tests for:
- **Happy Path**: Normal, expected inputs
- **Edge Cases**: Boundary values, empty inputs, max values
- **Error Cases**: Invalid inputs, exceptions, failures
- **Async Scenarios**: Timeouts, race conditions (if applicable)

### Assertion Best Practices
- One logical assertion per test (multiple expects for same concept OK)
- Use specific matchers (\`toEqual\`, \`toThrow\`, not just \`toBeTruthy\`)
- Test behavior, not implementation details
- Avoid testing private methods directly

## Mock Guidelines
- Only mock what you don't own (external services, APIs)
- Prefer dependency injection over module mocking
- Verify mock interactions when behavior depends on them

## Output Format
For each test file:
1. Imports and setup
2. Describe blocks organized by feature
3. Individual test cases with clear names
4. Helper functions at the bottom

After the tests, explain:
- What each test group verifies
- Why certain edge cases were included
- Any test utilities or fixtures needed

**IMPORTANT**: Do NOT implement the feature. Only write tests that will initially FAIL.`,
    variables: [
      { name: "feature", description: "Feature to test", type: "text" },
      {
        name: "behaviors",
        description: "Expected behaviors (one per line)",
        type: "text",
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.CheckCircle,
    tintColor: Color.Green,
  },
  {
    id: "test-coverage-audit",
    name: "Test Coverage Audit",
    category: "tdd",
    description: "Find untested edge cases and write tests for gaps",
    prompt: `You are a QA engineer specializing in test coverage analysis. Audit the test coverage for:

{{code}}

## Analysis Framework

### 1. Code Path Analysis
- Identify all branches (if/else, switch, ternary)
- Map all possible execution paths
- Note which paths lack test coverage

### 2. Boundary Value Analysis
For each input parameter, check tests exist for:
- **Minimum value**: Lowest valid input
- **Maximum value**: Highest valid input
- **Just below minimum**: Invalid low boundary
- **Just above maximum**: Invalid high boundary
- **Typical value**: Common case
- **Empty/null/undefined**: Missing input

### 3. Equivalence Partitioning
- Group inputs into equivalence classes
- Verify at least one test per class
- Identify missing equivalence classes

### 4. Error Path Coverage
Check for tests covering:
- **Thrown exceptions**: Each throw statement
- **Rejected promises**: Async error paths
- **Error callbacks**: Error handler invocations
- **Validation failures**: Input validation errors
- **External failures**: API errors, network issues

### 5. State Transition Testing
- Map state transitions in the code
- Verify tests for each valid transition
- Test invalid state transitions

### 6. Integration Point Coverage
- Test interactions with dependencies
- Verify correct data passed to dependencies
- Test handling of dependency responses

### 7. Async/Timing Coverage
- Race condition scenarios
- Timeout handling
- Concurrent operation edge cases

## Coverage Gaps Report

For each gap found, provide:

### Gap #N: [Description]
**Location**: File:line number
**Type**: [Branch/Boundary/Error/Integration/Async]
**Risk Level**: [Low/Medium/High/Critical]
**What could break**: Specific failure scenario
**Test to add**:
\`\`\`typescript
// Complete, runnable test code
\`\`\`

## Coverage Metrics Assessment
- Estimate current line coverage %
- Estimate current branch coverage %
- Identify functions with 0% coverage
- Highlight high-risk low-coverage areas

## Prioritized Test Recommendations
Rank the missing tests by:
1. Risk of bugs reaching production
2. Frequency of code path execution
3. Effort to write the test

Focus on tests that would catch real bugs, not just increase coverage numbers.`,
    variables: [
      {
        name: "code",
        description: "Code to audit",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.BarChart,
    tintColor: Color.Green,
  },

  // Code Review & Security
  {
    id: "security-review",
    name: "Security Review",
    category: "review",
    description: "Check for security vulnerabilities",
    prompt: `You are a senior security engineer performing a comprehensive security audit. Review this code:

{{code}}

## OWASP Top 10 Checklist

### A01: Broken Access Control
- [ ] Missing authorization checks on sensitive operations
- [ ] Insecure direct object references (IDOR)
- [ ] Path traversal vulnerabilities
- [ ] CORS misconfiguration
- [ ] Privilege escalation opportunities

### A02: Cryptographic Failures
- [ ] Sensitive data transmitted in cleartext
- [ ] Weak or deprecated algorithms (MD5, SHA1, DES)
- [ ] Hardcoded secrets, keys, or passwords
- [ ] Insufficient key length
- [ ] Missing encryption for sensitive data at rest

### A03: Injection
- [ ] SQL injection (parameterized queries?)
- [ ] NoSQL injection
- [ ] Command injection (shell commands)
- [ ] LDAP injection
- [ ] XPath injection
- [ ] Template injection (SSTI)
- [ ] Header injection

### A04: Insecure Design
- [ ] Missing rate limiting
- [ ] No account lockout mechanism
- [ ] Insufficient anti-automation
- [ ] Business logic flaws

### A05: Security Misconfiguration
- [ ] Debug mode enabled
- [ ] Default credentials
- [ ] Unnecessary features enabled
- [ ] Missing security headers
- [ ] Verbose error messages exposing internals

### A06: Vulnerable Components
- [ ] Known vulnerable dependencies
- [ ] Outdated libraries
- [ ] Unmaintained packages

### A07: Authentication Failures
- [ ] Weak password policy enforcement
- [ ] Missing brute force protection
- [ ] Session fixation vulnerabilities
- [ ] Insecure session management
- [ ] Missing multi-factor authentication option

### A08: Data Integrity Failures
- [ ] Missing integrity checks on critical data
- [ ] Insecure deserialization
- [ ] Unsigned software updates

### A09: Logging & Monitoring Failures
- [ ] Sensitive data in logs
- [ ] Missing audit trails
- [ ] Insufficient logging of security events

### A10: Server-Side Request Forgery (SSRF)
- [ ] Unvalidated URL inputs
- [ ] Missing allowlist for external requests

## Additional Security Checks

### Input Validation
- [ ] All user input validated server-side
- [ ] Proper type coercion
- [ ] Length limits enforced
- [ ] Dangerous characters sanitized

### Output Encoding
- [ ] XSS prevention (HTML encoding)
- [ ] Context-appropriate encoding (URL, JS, CSS)
- [ ] Content-Type headers set correctly

### Error Handling
- [ ] Errors don't leak sensitive info
- [ ] Stack traces hidden in production
- [ ] Consistent error responses

## Vulnerability Report Format

For each vulnerability found:

### [SEVERITY] Vulnerability Title
**CWE**: CWE-XXX (Common Weakness Enumeration ID)
**Location**: file:line
**Severity**: Critical/High/Medium/Low/Info
**CVSS Score**: X.X (if applicable)

**Description**: What the vulnerability is

**Vulnerable Code**:
\`\`\`
[problematic code snippet]
\`\`\`

**Proof of Concept**: How an attacker could exploit this

**Remediation**:
\`\`\`
[secure code example]
\`\`\`

**References**: Links to relevant security resources

## Summary
- Total vulnerabilities by severity
- Top 3 most critical issues to fix immediately
- Recommendations for security improvements`,
    variables: [
      {
        name: "code",
        description: "Code to review",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    model: "opus",
    icon: Icon.Lock,
    tintColor: Color.Red,
  },
  {
    id: "performance-audit",
    name: "Performance Audit",
    category: "review",
    description: "Analyze code for performance issues",
    prompt: `You are a performance engineer conducting a comprehensive performance audit. Analyze:

{{code}}

## Time Complexity Analysis

### Algorithm Assessment
For each function, determine:
- **Best Case**: O(?) - minimum operations
- **Average Case**: O(?) - typical operations
- **Worst Case**: O(?) - maximum operations

### Red Flags
- [ ] O(n²) or worse nested loops
- [ ] O(n) operations inside loops (becoming O(n²))
- [ ] Recursive calls without memoization
- [ ] String concatenation in loops
- [ ] Repeated array searches (use Set/Map instead)

## Memory Analysis

### Allocation Patterns
- [ ] Large objects created in hot paths
- [ ] Arrays growing dynamically (pre-size when possible)
- [ ] Closures capturing unnecessary scope
- [ ] Event listeners not cleaned up
- [ ] Circular references preventing GC

### Memory Leak Indicators
- [ ] Global variable accumulation
- [ ] Cache without eviction policy
- [ ] Unsubscribed observables/streams
- [ ] DOM references held after removal

## I/O Performance

### Database/API Calls
- [ ] N+1 query patterns (loop of individual queries)
- [ ] Missing database indexes (suggest based on queries)
- [ ] Over-fetching data (selecting unused columns)
- [ ] Missing pagination for large datasets
- [ ] Sequential calls that could be parallel

### File Operations
- [ ] Synchronous file operations blocking event loop
- [ ] Reading entire files when streaming would work
- [ ] Missing file handle cleanup

## Async Performance

### Concurrency Issues
- [ ] Sequential awaits that could be parallel (\`Promise.all\`)
- [ ] Missing request batching
- [ ] Blocking operations on main thread
- [ ] Missing debounce/throttle on frequent operations

### Resource Management
- [ ] Connection pool exhaustion risk
- [ ] Missing timeouts on external calls
- [ ] Retry logic without exponential backoff

## Caching Opportunities

### Computation Caching
- [ ] Repeated expensive calculations
- [ ] Results that could be memoized
- [ ] Derived data recalculated on every access

### Data Caching
- [ ] Frequently accessed data fetched repeatedly
- [ ] Missing HTTP caching headers
- [ ] API responses that could be cached

## Performance Report

For each issue found:

### Issue #N: [Title]
**Type**: [Algorithm/Memory/I/O/Async/Caching]
**Location**: file:line
**Impact**: [Critical/High/Medium/Low]
**Current Complexity**: O(?)
**Estimated Slowdown**: X times slower than optimal

**Problematic Code**:
\`\`\`
[code snippet]
\`\`\`

**Why It's Slow**: Technical explanation

**Optimized Solution**:
\`\`\`
[optimized code]
\`\`\`

**Expected Improvement**: X% faster / O(?) complexity

## Recommendations Summary
1. Quick wins (low effort, high impact)
2. Important improvements (medium effort, high impact)
3. Future optimizations (high effort, medium impact)

## Profiling Suggestions
- Key functions to profile
- Metrics to monitor
- Load test scenarios to run`,
    variables: [
      {
        name: "code",
        description: "Code to audit",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Bolt,
    tintColor: Color.Yellow,
  },
  {
    id: "pr-review",
    name: "PR Review",
    category: "review",
    description: "Review a diff as a senior engineer",
    prompt: `You are a senior software engineer reviewing a pull request. Provide thorough, constructive feedback.

{{diff}}

## Review Framework

### 1. Correctness
- Does the code do what it's supposed to do?
- Are there logic errors or incorrect assumptions?
- Do edge cases behave correctly?

### 2. Design & Architecture
- Does this fit the existing architecture?
- Are there better design patterns to use?
- Is the code organized logically?

### 3. Code Quality
- Is the code readable and maintainable?
- Are names clear and descriptive?
- Is there unnecessary duplication?

### 4. Testing
- Are changes adequately tested?
- Are edge cases covered?
- Would you trust these tests to catch regressions?

### 5. Security
- Any security concerns with these changes?
- Is input validated appropriately?
- Are there authorization checks where needed?

### 6. Performance
- Any performance implications?
- Are there more efficient approaches?

## Review Comments Format

Provide feedback as inline code review comments:

### file.ts:42 [SEVERITY]
**Category**: Bug/Design/Style/Performance/Security/Question
\`\`\`typescript
// The problematic code
\`\`\`
**Issue**: Clear description of the problem
**Suggestion**:
\`\`\`typescript
// Suggested improvement
\`\`\`

## Severity Levels
- **BLOCKER**: Must fix before merge (bugs, security issues)
- **MAJOR**: Should fix, significant quality concern
- **MINOR**: Nice to fix, style or minor improvements
- **NITPICK**: Optional, personal preference

## Review Checklist
- [ ] All tests pass
- [ ] Code follows project conventions
- [ ] No unnecessary changes included
- [ ] Commit messages are clear
- [ ] Documentation updated if needed
- [ ] No sensitive data or secrets

## Summary
- **Overall Assessment**: Approve / Request Changes / Needs Discussion
- **Key Concerns**: Top issues that must be addressed
- **Positive Highlights**: What was done well
- **Questions**: Anything needing clarification from the author

Be specific, be constructive, and explain the "why" behind suggestions. Focus on important issues rather than nitpicking.`,
    variables: [
      {
        name: "diff",
        description: "Git diff to review",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Eye,
    tintColor: Color.Blue,
  },

  // Refactoring
  {
    id: "extract-abstraction",
    name: "Extract & Abstract",
    category: "refactoring",
    description: "Extract reusable patterns from code",
    prompt: `You are a refactoring expert. Extract reusable patterns and reduce duplication in:

{{code}}

## Refactoring Principles

### Rule of Three
Only extract when you see the same pattern 3+ times. Premature abstraction is worse than duplication.

### SOLID Extraction Guidelines
- **Single Responsibility**: Each extracted unit does one thing
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

## Analysis Steps

### 1. Identify Duplication
- Exact code duplicates
- Similar code with minor variations
- Repeated patterns (even if code differs)

### 2. Classify Duplication Type
- **Structural**: Same code structure, different data
- **Algorithmic**: Same algorithm, different types
- **Pattern**: Same design pattern usage

### 3. Choose Extraction Strategy
- **Extract Function**: For duplicated logic
- **Extract Class**: For related functions + data
- **Extract Interface**: For common contracts
- **Extract Module**: For cohesive feature sets
- **Parameterize**: For similar code with variations

## Refactoring Techniques

### Function Extraction
\`\`\`typescript
// Before: duplicated validation
if (user.age < 0 || user.age > 150) throw new Error('Invalid age');
if (employee.age < 0 || employee.age > 150) throw new Error('Invalid age');

// After: extracted function
function validateAge(age: number): void {
  if (age < 0 || age > 150) throw new Error('Invalid age');
}
\`\`\`

### Composition Over Inheritance
Prefer composing behaviors over creating inheritance hierarchies.

### Strategy Pattern
When similar code differs only in algorithm, extract strategies.

## Output Format

For each extraction:

### Extraction #N: [Name]
**Type**: Function/Class/Interface/Module
**Duplication Count**: X occurrences
**Lines Saved**: X lines

**Before** (showing all duplicates):
\`\`\`typescript
[original duplicated code]
\`\`\`

**After**:
\`\`\`typescript
[extracted abstraction]
\`\`\`

**Usage**:
\`\`\`typescript
[how to use the new abstraction]
\`\`\`

**Why This Abstraction**: Explain naming and design choices

## Summary
- Total extractions recommended
- Lines of code reduced
- Complexity impact
- Any extractions to AVOID (premature abstraction warnings)`,
    variables: [
      {
        name: "code",
        description: "Code to refactor",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Hammer,
    tintColor: Color.Orange,
  },
  {
    id: "simplify-complexity",
    name: "Simplify Complexity",
    category: "refactoring",
    description: "Reduce cyclomatic complexity",
    prompt: `You are a code quality expert specializing in complexity reduction. Simplify:

{{code}}

## Complexity Metrics

### Cyclomatic Complexity
Count decision points: if, else, case, for, while, &&, ||, ?:
- Target: < 10 per function
- Warning: 10-20
- Critical: > 20

### Cognitive Complexity
Measures how hard code is to understand:
- Nested structures add more than flat ones
- Breaks in linear flow add complexity

## Simplification Techniques

### 1. Early Returns (Guard Clauses)
\`\`\`typescript
// Before: Nested conditions
function process(user) {
  if (user) {
    if (user.active) {
      if (user.verified) {
        // actual logic here
      }
    }
  }
}

// After: Guard clauses
function process(user) {
  if (!user) return;
  if (!user.active) return;
  if (!user.verified) return;
  // actual logic here
}
\`\`\`

### 2. Extract Conditional Logic
\`\`\`typescript
// Before: Complex condition
if (user.age >= 18 && user.country === 'US' && user.hasLicense && !user.suspended) {

// After: Named condition
const canDrive = user.age >= 18 && user.country === 'US' && user.hasLicense && !user.suspended;
if (canDrive) {
// Or extract to function: if (canUserDrive(user)) {
\`\`\`

### 3. Replace Conditionals with Polymorphism
When switch/if-else selects behavior by type, use polymorphism instead.

### 4. Replace Nested Conditionals with Lookup
\`\`\`typescript
// Before: Nested if-else
if (type === 'A') { return 1; }
else if (type === 'B') { return 2; }
else if (type === 'C') { return 3; }

// After: Lookup table
const typeValues = { A: 1, B: 2, C: 3 };
return typeValues[type];
\`\`\`

### 5. Decompose Complex Functions
Split large functions into smaller, focused functions.

### 6. Use Optional Chaining and Nullish Coalescing
\`\`\`typescript
// Before
const name = user && user.profile && user.profile.name ? user.profile.name : 'Anonymous';

// After
const name = user?.profile?.name ?? 'Anonymous';
\`\`\`

## Refactoring Plan

For each simplification:

### Simplification #N: [Technique Used]
**Location**: file:line
**Complexity Before**: X
**Complexity After**: Y
**Reduction**: Z points

**Before**:
\`\`\`typescript
[complex code]
\`\`\`

**After**:
\`\`\`typescript
[simplified code]
\`\`\`

**Explanation**: Why this simplification improves readability

## Behavior Preservation Checklist
- [ ] All code paths still reachable
- [ ] Same outputs for same inputs
- [ ] Error handling preserved
- [ ] Side effects unchanged

## Summary
- Total complexity reduction
- Number of functions simplified
- Estimated readability improvement
- Suggested tests to verify behavior preserved`,
    variables: [
      {
        name: "code",
        description: "Complex code to simplify",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Stars,
    tintColor: Color.Magenta,
  },
  {
    id: "type-strengthening",
    name: "Type Strengthening",
    category: "refactoring",
    description: "Make types more precise and safe",
    prompt: `You are a TypeScript expert specializing in type safety. Strengthen the types in:

{{code}}

## Type Strengthening Goals
1. Catch bugs at compile time, not runtime
2. Make illegal states unrepresentable
3. Encode business rules in the type system
4. Improve IDE autocomplete and documentation

## Type Improvement Techniques

### 1. Replace \`any\` with Specific Types
\`\`\`typescript
// Before
function process(data: any): any

// After
function process(data: UserInput): ProcessedResult
\`\`\`

### 2. Discriminated Unions for State
\`\`\`typescript
// Before: Impossible states possible
interface Request {
  status: string;
  data?: Data;
  error?: Error;
}

// After: Only valid states representable
type Request =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };
\`\`\`

### 3. Branded Types for Type-Safe IDs
\`\`\`typescript
// Before: Easy to mix up IDs
function getUser(userId: string, orgId: string)
getUser(orgId, userId) // Compiles but wrong!

// After: Compile-time safety
type UserId = string & { readonly brand: unique symbol };
type OrgId = string & { readonly brand: unique symbol };
function getUser(userId: UserId, orgId: OrgId)
\`\`\`

### 4. Const Assertions for Literals
\`\`\`typescript
// Before: string type
const ROLES = ['admin', 'user', 'guest'];
// roles: string[]

// After: literal union type
const ROLES = ['admin', 'user', 'guest'] as const;
// roles: readonly ['admin', 'user', 'guest']
type Role = typeof ROLES[number]; // 'admin' | 'user' | 'guest'
\`\`\`

### 5. Readonly for Immutability
\`\`\`typescript
// Before: Mutable
interface Config {
  apiUrl: string;
  timeout: number;
}

// After: Immutable
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}
// Or: Readonly<Config>
\`\`\`

### 6. Template Literal Types
\`\`\`typescript
// Before: Any string
type EventName = string;

// After: Structured string
type EventName = \`\${Lowercase<string>}:\${'created' | 'updated' | 'deleted'}\`;
// Matches: "user:created", "order:deleted", etc.
\`\`\`

### 7. Exhaustive Checks
\`\`\`typescript
function assertNever(x: never): never {
  throw new Error(\`Unexpected: \${x}\`);
}

function handle(status: Status) {
  switch (status) {
    case 'active': return handleActive();
    case 'inactive': return handleInactive();
    default: return assertNever(status); // Compile error if case missing
  }
}
\`\`\`

### 8. Utility Types
- \`Partial<T>\`: Make all properties optional
- \`Required<T>\`: Make all properties required
- \`Pick<T, K>\`: Select specific properties
- \`Omit<T, K>\`: Exclude specific properties
- \`Record<K, V>\`: Create object type

## Type Strengthening Report

For each improvement:

### Improvement #N: [Technique]
**Location**: file:line
**Risk Level Before**: High/Medium/Low (runtime error potential)
**Type Safety After**: Description of guarantees

**Before**:
\`\`\`typescript
[weak types]
\`\`\`

**After**:
\`\`\`typescript
[strong types]
\`\`\`

**Bugs Prevented**: What errors this catches at compile time

## Summary
- \`any\` usages eliminated: X
- Discriminated unions added: X
- Branded types introduced: X
- Estimated bugs prevented: X categories`,
    variables: [
      {
        name: "code",
        description: "Code to strengthen types",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Shield,
    tintColor: Color.Blue,
  },

  // Debugging
  {
    id: "error-diagnosis",
    name: "Error Diagnosis",
    category: "debugging",
    description: "Diagnose an error and suggest fixes",
    prompt: `You are an expert debugger. Diagnose this error using systematic root cause analysis:

{{error}}

## Error Analysis Framework

### 1. Parse the Error
- **Error Type**: What category of error (TypeError, NetworkError, etc.)?
- **Error Message**: What does the message indicate?
- **Stack Trace**: Where did the error originate?
- **Context**: What operation was being performed?

### 2. Identify Error Location
- **File**: Which file threw the error?
- **Line**: Which line number?
- **Function**: Which function was executing?
- **Call Chain**: What sequence of calls led here?

### 3. Root Cause Hypotheses
Rank potential causes by probability:

| Rank | Hypothesis | Probability | Evidence |
|------|-----------|-------------|----------|
| 1 | [Most likely cause] | High | [Why you think this] |
| 2 | [Second likely cause] | Medium | [Supporting evidence] |
| 3 | [Less likely cause] | Low | [Possible but unlikely] |

### 4. Diagnostic Questions
What information would help narrow down the cause?
- What was the input data?
- What was the system state?
- Is this reproducible?
- When did it start happening?

## Diagnosis by Error Category

### Null/Undefined Errors
- Check for missing null checks
- Verify async data is loaded before access
- Check optional chaining usage

### Type Errors
- Check type coercion issues
- Verify API response shapes
- Check for incorrect function signatures

### Network Errors
- Check endpoint availability
- Verify request format
- Check authentication/authorization
- Look for CORS issues

### Syntax/Runtime Errors
- Check for typos
- Verify imports are correct
- Check for circular dependencies

## Recommended Fixes

For each hypothesis, provide a fix:

### Fix for Hypothesis #1: [Cause]
**Confidence**: High/Medium/Low
\`\`\`typescript
[code fix]
\`\`\`
**Why this works**: Explanation

### Fix for Hypothesis #2: [Cause]
**Confidence**: High/Medium/Low
\`\`\`typescript
[code fix]
\`\`\`

## Debugging Steps
If the fix isn't clear, suggest debugging steps:

1. **Add logging**: Where to add console.log/debugger
2. **Inspect state**: What variables to examine
3. **Isolate the issue**: How to create a minimal reproduction
4. **Binary search**: How to narrow down the cause

## Prevention Recommendations
How to prevent this type of error in the future:
- Type improvements
- Validation to add
- Tests to write
- Error handling to improve

## Additional Context Needed
If you can't fully diagnose, list what would help:
- Specific files to examine
- Environment information needed
- Related code to review`,
    variables: [
      {
        name: "error",
        description: "Error message and stack trace",
        type: "text",
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.MagnifyingGlass,
    tintColor: Color.Red,
  },
  {
    id: "debug-strategy",
    name: "Debug Strategy",
    category: "debugging",
    description: "Create a systematic debugging plan",
    prompt: `You are a debugging strategist. Create a systematic plan to diagnose:

{{symptom}}

## Scientific Debugging Method

### 1. Define the Problem Precisely
- **Expected Behavior**: What should happen?
- **Actual Behavior**: What is happening?
- **Difference**: Exactly how do they differ?
- **Frequency**: Always, sometimes, or rarely?

### 2. Gather Information
What do we already know?
- When does it happen?
- When does it NOT happen?
- What changed recently?
- Who is affected?

### 3. Form Hypotheses
Based on the symptom, potential causes ranked by likelihood:

| # | Hypothesis | Why Likely | Test to Confirm/Refute |
|---|-----------|-----------|------------------------|
| 1 | [cause] | [reasoning] | [specific test] |
| 2 | [cause] | [reasoning] | [specific test] |
| 3 | [cause] | [reasoning] | [specific test] |

## Debugging Tactics

### Logging Strategy
Add strategic logging to trace execution:

\`\`\`typescript
// Entry points - log inputs
console.log('[FunctionName] Input:', { param1, param2 });

// Decision points - log conditions
console.log('[FunctionName] Condition check:', { condition, result });

// Exit points - log outputs
console.log('[FunctionName] Output:', { result });

// Error boundaries - log failures
console.error('[FunctionName] Error:', { error, context });
\`\`\`

**Specific logging points for this issue**:
1. [Location 1]: Log [what] to check [hypothesis]
2. [Location 2]: Log [what] to check [hypothesis]

### State Inspection Points
Examine these variables/states:
- [Variable 1]: Expected value vs actual
- [Variable 2]: Check at this point in execution
- [State]: Verify this condition

### Binary Search Approach
Narrow down the problem location:

1. **Start**: [Beginning of suspect code path]
2. **End**: [Where error manifests]
3. **Midpoint**: [Check state here first]
4. **Iterate**: Based on midpoint, check earlier or later half

### Minimal Reproduction
Steps to create isolated test case:

1. [Setup step]
2. [Action that triggers issue]
3. [Observe the symptom]

Minimal code to reproduce:
\`\`\`typescript
// Smallest code that shows the problem
\`\`\`

## Environment Checks
- [ ] Check environment variables
- [ ] Verify dependencies/versions
- [ ] Check configuration files
- [ ] Compare working vs non-working environments

## Timeline for Investigation
If time is limited, prioritize:

### Quick checks (5 min)
- [ ] Check 1
- [ ] Check 2

### Medium investigation (30 min)
- [ ] Investigation 1
- [ ] Investigation 2

### Deep dive (1+ hour)
- [ ] Deep investigation 1
- [ ] Deep investigation 2

## Escalation Path
If initial debugging doesn't work:
1. [Next step to try]
2. [Expert to consult]
3. [External resources to check]

## Documentation
When the bug is found, document:
- Root cause
- Fix applied
- How to prevent in future
- Tests added`,
    variables: [
      {
        name: "symptom",
        description: "The symptom or unexpected behavior",
        type: "text",
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Bug,
    tintColor: Color.Red,
  },

  // Documentation
  {
    id: "explain-junior",
    name: "Explain for Junior Dev",
    category: "docs",
    description: "Explain code for a junior developer",
    prompt: `You are a patient senior developer explaining code to a junior team member. Explain:

{{code}}

## Explanation Framework

### 1. The Big Picture (30 seconds)
Start with a one-sentence summary a non-programmer could understand.

"This code [does what] for [whom] so that [benefit]."

### 2. What It Does (2 minutes)
Explain the purpose at a high level:
- What problem does this solve?
- Where does it fit in the larger system?
- Who/what calls this code?
- What does it output/return?

### 3. Step-by-Step Walkthrough (5 minutes)
Go through the code line by line or block by block:

\`\`\`typescript
// Line X-Y: [what this section does]
[code snippet]
\`\`\`
**Explanation**: [Why this is done, in plain language]
**Analogy**: [Real-world comparison if helpful]

### 4. Key Concepts Introduced
List concepts a junior might not know:

| Concept | What It Is | Why It's Used Here |
|---------|-----------|-------------------|
| [Term] | [Simple explanation] | [Purpose in this code] |

### 5. Design Decisions
Explain the "why" behind architectural choices:

**Q: Why is it done this way?**
A: [Explanation of the design decision]

**Q: What alternatives exist?**
A: [Other approaches and why this one was chosen]

### 6. Common Pitfalls
Mistakes to avoid when working with this code:

**Pitfall 1: [What could go wrong]**
- Why it happens: [Explanation]
- How to avoid: [Prevention strategy]

### 7. Related Concepts to Study
To fully understand this code, learn about:

1. **[Concept]**: [Brief description] - [Resource link/suggestion]
2. **[Concept]**: [Brief description] - [Resource link/suggestion]

### 8. Try It Yourself
Exercises to build understanding:

1. **Trace the execution**: Walk through with sample input [X]
2. **Modify it**: Try changing [Y] to see what happens
3. **Break it**: What happens if you [Z]?

## Glossary
Technical terms used, with simple definitions:
- **[Term]**: [Definition a beginner can understand]

Remember: There are no stupid questions. Ask if anything is unclear!`,
    variables: [
      {
        name: "code",
        description: "Code to explain",
        type: "code",
        allowRepositoryPath: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    model: "haiku",
    icon: Icon.Book,
    tintColor: Color.Blue,
  },
  {
    id: "api-documentation",
    name: "API Documentation",
    category: "docs",
    description: "Generate API documentation",
    prompt: `You are a technical writer creating comprehensive API documentation for {{endpoint}}.

Generate documentation in OpenAPI/Swagger-compatible format:

## Endpoint Overview

### [HTTP Method] /path/to/endpoint
**Summary**: One-line description
**Description**: Detailed explanation of what this endpoint does, when to use it, and any important context.

**Tags**: [category1, category2]

---

## Authentication
**Required**: Yes/No
**Type**: Bearer Token / API Key / OAuth 2.0 / None
**Header**: \`Authorization: Bearer <token>\`

---

## Request

### Headers
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Content-Type | string | Yes | Must be \`application/json\` |
| Authorization | string | Yes | Bearer token for authentication |

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID format) |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | integer | No | 20 | Number of results (1-100) |
| offset | integer | No | 0 | Pagination offset |

### Request Body
\`\`\`json
{
  "field1": "string (required) - Description",
  "field2": 123,
  "nested": {
    "subfield": "value"
  }
}
\`\`\`

**Schema**:
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| field1 | string | Yes | 1-255 chars | Description |
| field2 | integer | No | 0-1000 | Description |

---

## Response

### Success Response (200 OK)
\`\`\`json
{
  "data": {
    "id": "uuid-here",
    "created_at": "2024-01-20T12:00:00Z",
    "field1": "value"
  },
  "meta": {
    "request_id": "req_123"
  }
}
\`\`\`

### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| data | object | The requested resource |
| data.id | string | Unique identifier |
| meta.request_id | string | ID for support inquiries |

---

## Error Responses

### 400 Bad Request
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
\`\`\`

### 401 Unauthorized
**Cause**: Missing or invalid authentication
\`\`\`json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid token" } }
\`\`\`

### 403 Forbidden
**Cause**: Valid auth but insufficient permissions

### 404 Not Found
**Cause**: Resource doesn't exist

### 429 Too Many Requests
**Cause**: Rate limit exceeded
**Headers**: \`Retry-After: 60\`

### 500 Internal Server Error
**Cause**: Unexpected server error

---

## Error Codes Reference
| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| VALIDATION_ERROR | 400 | Invalid input | Check request format |
| UNAUTHORIZED | 401 | Auth failed | Refresh token |
| NOT_FOUND | 404 | Resource missing | Verify ID exists |

---

## Rate Limiting
- **Limit**: 100 requests per minute
- **Headers**: \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`
- **Exceeded**: Returns 429 with Retry-After header

---

## Examples

### cURL
\`\`\`bash
curl -X POST https://api.example.com/endpoint \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"field1": "value"}'
\`\`\`

### JavaScript (fetch)
\`\`\`javascript
const response = await fetch('https://api.example.com/endpoint', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ field1: 'value' })
});
\`\`\`

### Python (requests)
\`\`\`python
import requests
response = requests.post(
    'https://api.example.com/endpoint',
    headers={'Authorization': 'Bearer TOKEN'},
    json={'field1': 'value'}
)
\`\`\`

---

## Changelog
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-01 | Initial release |`,
    variables: [
      {
        name: "endpoint",
        description: "API endpoint to document",
        type: "text",
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.List,
    tintColor: Color.Purple,
  },
  {
    id: "adr-template",
    name: "Architecture Decision Record",
    category: "docs",
    description: "Create an ADR for a technical decision",
    prompt: `You are a software architect documenting an important technical decision. Create an Architecture Decision Record for:

{{decision}}

---

# ADR-[NUMBER]: [Title - Short Imperative Statement]

## Metadata
- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX
- **Date**: [Date of decision]
- **Decision Makers**: [Who was involved]
- **Technical Area**: [Component/system affected]
- **Confidence Level**: High | Medium | Low

---

## Context

### Problem Statement
[What is the issue or opportunity we're addressing? Be specific.]

### Background
[Relevant history, prior decisions, or context that led to this decision point.]

### Constraints
- **Technical**: [Technical limitations or requirements]
- **Business**: [Business requirements or deadlines]
- **Team**: [Team skills, capacity, or preferences]
- **Budget**: [Cost constraints if relevant]

### Requirements
- [Functional requirement 1]
- [Non-functional requirement 1 (performance, security, etc.)]

---

## Decision Drivers
What factors are most important in making this decision?

1. **[Driver 1]** - [Why it matters]
2. **[Driver 2]** - [Why it matters]
3. **[Driver 3]** - [Why it matters]

---

## Considered Options

### Option 1: [Name]
**Description**: [What this option entails]

**Pros**:
- [Advantage 1]
- [Advantage 2]

**Cons**:
- [Disadvantage 1]
- [Disadvantage 2]

**Estimated Effort**: [Small/Medium/Large]

### Option 2: [Name]
[Same structure]

### Option 3: [Name]
[Same structure]

---

## Decision

**We will use Option [X]: [Name]**

### Rationale
[Detailed explanation of why this option was chosen over alternatives. Reference the decision drivers.]

### Trade-offs Accepted
[What are we consciously giving up or accepting as costs?]

---

## Consequences

### Positive
- [Good outcome 1]
- [Good outcome 2]

### Negative
- [Downside 1 and mitigation]
- [Downside 2 and mitigation]

### Neutral
- [Side effect that's neither good nor bad]

---

## Implementation Notes

### Action Items
- [ ] [Specific task 1] - Owner: [Name]
- [ ] [Specific task 2] - Owner: [Name]

### Migration Strategy
[If replacing something, how will we migrate?]

### Rollback Plan
[How can we reverse this if needed?]

---

## Related Decisions
- **ADR-XXX**: [Related decision and how it connects]
- **RFC-XXX**: [Related proposal]

---

## References
- [Link to relevant documentation]
- [Link to relevant discussion]
- [Link to technical resources]

---

## Review Notes
[Space for future notes, lessons learned, or updates]

---

*This ADR follows the [MADR template](https://adr.github.io/madr/) format.*`,
    variables: [
      {
        name: "decision",
        description: "The technical decision to document",
        type: "text",
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Pencil,
    tintColor: Color.Orange,
  },

  // Advanced Multi-Step
  {
    id: "feature-pipeline",
    name: "Feature Pipeline",
    category: "advanced",
    description:
      "Full feature implementation with planning, coding, testing, and review",
    prompt: `You are a full-stack development team implementing {{feature}} through a complete development pipeline.{{#if projectPath}}

Project location: {{projectPath}}{{/if}}

Execute all four phases in sequence, producing concrete output for each.

---

# Phase 1: ARCHITECT

## 1.1 Requirements Analysis
- **User Story**: As a [user], I want [feature] so that [benefit]
- **Acceptance Criteria**: Specific, testable conditions
- **Out of Scope**: What this feature does NOT include

## 1.2 Technical Design
- **Architecture**: How this fits into the existing system
- **Data Model**: New or modified data structures
- **API Design**: Endpoints, request/response formats
- **Dependencies**: External services or libraries needed

## 1.3 Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| [Edge case 1] | [How to handle] |
| [Edge case 2] | [How to handle] |

## 1.4 Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| [Risk 1] | H/M/L | H/M/L | [Strategy] |

---

# Phase 2: BUILDER

## 2.1 Implementation Plan
Order of implementation:
1. [Component 1] - [Why first]
2. [Component 2] - [Dependencies]
3. [Component 3] - [Final integration]

## 2.2 Code Implementation

### File: [path/to/file.ts]
\`\`\`typescript
// Well-commented, production-ready code
// With proper error handling
// Following project conventions
\`\`\`

### File: [path/to/another-file.ts]
\`\`\`typescript
// Additional implementation files
\`\`\`

## 2.3 Configuration Changes
Any config, environment variables, or setup required.

---

# Phase 3: QA

## 3.1 Test Plan
| Test Type | Coverage Target | Priority |
|-----------|----------------|----------|
| Unit | 80%+ | High |
| Integration | Key flows | High |
| E2E | Happy paths | Medium |

## 3.2 Unit Tests
\`\`\`typescript
describe('[Component]', () => {
  // Comprehensive unit tests
  // Edge cases covered
  // Error scenarios tested
});
\`\`\`

## 3.3 Integration Tests
\`\`\`typescript
describe('[Feature] Integration', () => {
  // Component interaction tests
  // API contract tests
});
\`\`\`

## 3.4 Manual Test Scenarios
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | [Name] | [Steps] | [Expected] |

---

# Phase 4: REVIEWER

## 4.1 Code Review Checklist
- [ ] Code follows project style guide
- [ ] No security vulnerabilities
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] Tests are meaningful

## 4.2 Issues Found
| Severity | Location | Issue | Recommendation |
|----------|----------|-------|----------------|
| [H/M/L] | file:line | [Issue] | [Fix] |

## 4.3 Security Review
- [ ] Input validation
- [ ] Authentication/authorization
- [ ] Data exposure risks

## 4.4 Performance Review
- [ ] No N+1 queries
- [ ] Appropriate caching
- [ ] No blocking operations

## 4.5 Final Recommendation
**Status**: Ready for Merge / Needs Changes / Rejected
**Summary**: [Overall assessment and any remaining concerns]

---

# Deployment Checklist
- [ ] Database migrations
- [ ] Environment variables
- [ ] Feature flags
- [ ] Monitoring/alerting
- [ ] Documentation updated`,
    variables: [
      { name: "feature", description: "Feature to implement", type: "text" },
      {
        name: "projectPath",
        description: "Path to create the new project (optional)",
        type: "path",
        allowDirectories: true,
      },
    ],
    isBuiltIn: true,
    usageCount: 0,
    model: "opus",
    icon: Icon.Rocket,
    tintColor: Color.Purple,
  },
  {
    id: "codebase-onboarding",
    name: "Codebase Onboarding Guide",
    category: "advanced",
    description: "Create an onboarding guide for the codebase",
    prompt: `You are a senior developer creating an onboarding guide for new team members. Explore the current codebase and document everything a new developer needs to know.

# [Project Name] Onboarding Guide

## Quick Start (5 minutes to running)

### Prerequisites
- [ ] [Tool 1] version X+
- [ ] [Tool 2] installed
- [ ] Access to [service/repo]

### Get Running
\`\`\`bash
# Step-by-step commands to get the project running
git clone [repo]
cd [project]
[install dependencies]
[setup environment]
[run command]
\`\`\`

### Verify It Works
- [ ] [How to verify frontend is running]
- [ ] [How to verify backend is running]
- [ ] [How to verify database is connected]

---

## Architecture Overview

### System Diagram
\`\`\`
[ASCII diagram of major components and their relationships]
\`\`\`

### Tech Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | [Tech] | [Purpose] |
| Backend | [Tech] | [Purpose] |
| Database | [Tech] | [Purpose] |
| Infrastructure | [Tech] | [Purpose] |

### Key Design Decisions
1. **[Decision]**: [Why this choice was made]
2. **[Decision]**: [Why this choice was made]

---

## Project Structure

\`\`\`
project/
├── src/
│   ├── [folder]/     # [What this contains]
│   ├── [folder]/     # [What this contains]
│   └── [folder]/     # [What this contains]
├── tests/            # [Test organization]
├── config/           # [Configuration files]
└── [other]/          # [Other important directories]
\`\`\`

---

## Key Entry Points

### Where Execution Starts
- **Main entry**: \`[file]\` - [What happens here]
- **API routes**: \`[file]\` - [How routes are defined]
- **Database**: \`[file]\` - [Connection setup]

### Important Files to Read First
1. **\`[file]\`**: [Why it's important]
2. **\`[file]\`**: [Why it's important]
3. **\`[file]\`**: [Why it's important]

---

## Core Concepts & Patterns

### Data Flow
\`\`\`
[Diagram showing how data moves through the system]
User → [Layer] → [Layer] → [Layer] → Database
\`\`\`

### Patterns Used
| Pattern | Where Used | Example |
|---------|-----------|---------|
| [Pattern] | [Location] | \`[file:line]\` |

### Naming Conventions
- Files: [convention]
- Functions: [convention]
- Variables: [convention]
- Components: [convention]

---

## Development Workflow

### Branch Strategy
- \`main\`: [What this represents]
- \`develop\`: [What this represents]
- Feature branches: [Naming convention]

### Making Changes
1. Create branch from [base]
2. Make changes
3. Run tests: \`[command]\`
4. Run linter: \`[command]\`
5. Create PR to [branch]

### Testing
\`\`\`bash
# Run all tests
[command]

# Run specific tests
[command]

# Run with coverage
[command]
\`\`\`

---

## Configuration

### Environment Variables
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| [VAR] | Yes/No | [What it does] | [Example value] |

### Configuration Files
- \`[file]\`: [What it configures]
- \`[file]\`: [What it configures]

---

## Common Tasks

### Add a New Feature
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Add a New API Endpoint
1. [Step 1 with file location]
2. [Step 2]
3. [Step 3]

### Debug an Issue
1. [How to enable debug logging]
2. [Where to find logs]
3. [Common debugging tools]

---

## Troubleshooting

### Common Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| [Problem] | [Why it happens] | [How to fix] |

### Getting Help
- Documentation: [Link]
- Team channel: [Channel]
- Ask: [Who to ask about what]

---

## Glossary
| Term | Definition |
|------|-----------|
| [Domain term] | [What it means in this project] |

---

## Next Steps
After completing this guide:
1. [ ] Complete the tutorial: [link]
2. [ ] Fix a "good first issue": [link]
3. [ ] Review recent PRs to see code patterns
4. [ ] Pair with [team member] on a feature`,
    variables: [],
    isBuiltIn: true,
    usageCount: 0,
    icon: Icon.Map,
    tintColor: Color.Green,
  },
];

/**
 * Get all prompts (built-in + custom)
 */
export async function getAllPrompts(): Promise<PromptTemplate[]> {
  const customPrompts = await getCustomPrompts();
  const usageCounts = await getUsageCounts();

  // Merge usage counts into built-in prompts
  const builtInWithUsage = BUILT_IN_PROMPTS.map((p) => ({
    ...p,
    usageCount: usageCounts[p.id] || 0,
  }));

  return [...builtInWithUsage, ...customPrompts];
}

/**
 * Get custom user prompts
 */
async function getCustomPrompts(): Promise<PromptTemplate[]> {
  const stored = await LocalStorage.getItem<string>(CUSTOM_PROMPTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Save a custom prompt
 */
export async function saveCustomPrompt(
  prompt: Omit<PromptTemplate, "id" | "isBuiltIn">,
): Promise<void> {
  const customs = await getCustomPrompts();
  const newPrompt: PromptTemplate = {
    ...prompt,
    id: `custom-${randomUUID()}`,
    isBuiltIn: false,
  };
  customs.push(newPrompt);
  await LocalStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(customs));
}

/**
 * Delete a custom prompt
 */
export async function deleteCustomPrompt(id: string): Promise<void> {
  const customs = await getCustomPrompts();
  const filtered = customs.filter((p) => p.id !== id);
  await LocalStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(filtered));
}

/**
 * Get usage counts
 */
async function getUsageCounts(): Promise<Record<string, number>> {
  const stored = await LocalStorage.getItem<string>(PROMPT_USAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

/**
 * Increment usage count for a prompt
 */
export async function incrementUsageCount(id: string): Promise<void> {
  const counts = await getUsageCounts();
  counts[id] = (counts[id] || 0) + 1;
  await LocalStorage.setItem(PROMPT_USAGE_KEY, JSON.stringify(counts));
}

/**
 * Get prompts by category
 */
export function getPromptsByCategory(
  prompts: PromptTemplate[],
  category: PromptCategory,
): PromptTemplate[] {
  return prompts.filter((p) => p.category === category);
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: PromptCategory): {
  name: string;
  icon: Icon;
  tintColor: Color;
} {
  const info: Record<
    PromptCategory,
    { name: string; icon: Icon; tintColor: Color }
  > = {
    planning: {
      name: "Planning & Architecture",
      icon: Icon.Document,
      tintColor: Color.Blue,
    },
    tdd: {
      name: "Test-Driven Development",
      icon: Icon.CheckCircle,
      tintColor: Color.Green,
    },
    review: {
      name: "Code Review & Security",
      icon: Icon.Eye,
      tintColor: Color.Blue,
    },
    refactoring: {
      name: "Refactoring",
      icon: Icon.Hammer,
      tintColor: Color.Orange,
    },
    debugging: { name: "Debugging", icon: Icon.Bug, tintColor: Color.Red },
    docs: { name: "Documentation", icon: Icon.Book, tintColor: Color.Blue },
    advanced: {
      name: "Advanced Workflows",
      icon: Icon.Rocket,
      tintColor: Color.Purple,
    },
  };
  return info[category];
}

/**
 * Substitute variables in a prompt
 */
export function substituteVariables(
  prompt: string,
  variables: Record<string, string>,
): string {
  let result = prompt;

  // Handle {{#if varName}}...{{/if}} conditional blocks
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, varName, content) => {
      const value = variables[varName];
      if (value && value.trim()) {
        // Include the content and substitute variables within it
        return content;
      }
      return "";
    },
  );

  // Substitute regular {{varName}} placeholders
  for (const [name, value] of Object.entries(variables)) {
    result = result.replace(
      new RegExp(`\\{\\{${name}\\}\\}`, "g"),
      value || "",
    );
  }
  return result;
}
