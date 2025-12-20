---
targets:
  - cursor
  - claudecode
  - codexcli
root: false
description: "Guidance on how to approach implementation tasks"
globs:
  - "**/*"
cursor:
  alwaysApply: true
  globs:
    - "**/*"
---

# Implement Task

**CRITICAL**: Always approach task implementation methodically with careful planning and execution. Never jump straight to coding without understanding requirements, evaluating approaches, and considering tradeoffs.

## Core Principle

Task implementation requires systematic thinking: understanding requirements, evaluating multiple approaches, considering tradeoffs, and implementing incrementally with proper testing. Rushing to code without planning leads to poor solutions, technical debt, and wasted effort.

## Required Workflow

### 1. Think Through Strategy

- **Understand the complete requirement**: What exactly needs to be built? What are the constraints?
- **Identify key components needed**: What pieces are required? What dependencies exist?
- **Consider dependencies and constraints**: What are the technical, time, and resource limitations?
- **Plan the implementation approach**: How will you structure the solution?

### 2. Evaluate Approaches

- **List possible implementation strategies**: Brainstorm multiple ways to solve the problem
- **Compare pros and cons of each**: What are the tradeoffs?
- **Consider multiple factors**:
  - Performance implications
  - Maintainability
  - Scalability
  - Code reusability
  - Testing complexity
  - Time to implement
  - Long-term viability

### 3. Consider Tradeoffs

- **Short-term vs long-term benefits**: Quick fix vs sustainable solution
- **Complexity vs simplicity**: Is the added complexity justified?
- **Performance vs readability**: Balance optimization with maintainability
- **Flexibility vs focused solution**: Over-engineering vs under-engineering
- **Time to implement vs perfect solution**: Pragmatic vs idealistic approach

### 4. Implementation Steps

1. **Break down into subtasks**: Divide the work into manageable pieces
2. **Start with core functionality**: Build the essential features first
3. **Implement incrementally**: Add features one at a time
4. **Test each component**: Verify each piece works before moving on
5. **Integrate components**: Combine pieces and verify integration
6. **Add error handling**: Handle edge cases and error conditions
7. **Optimize if needed**: Improve performance only after correctness
8. **Document decisions**: Record important choices and rationale

### 5. Best Practices

- **Write tests first (TDD approach)**: Define expected behavior before implementation
- **Keep functions small and focused**: Single responsibility principle
- **Use meaningful names**: Code should be self-documenting
- **Comment complex logic**: Explain why, not what
- **Handle edge cases**: Consider boundary conditions and error states
- **Consider future maintenance**: Write code others can understand and modify

## Examples of What NOT to Do

❌ **Don't**: Start coding immediately without understanding requirements
❌ **Don't**: Implement the first solution that comes to mind without evaluating alternatives
❌ **Don't**: Skip planning and jump straight to implementation
❌ **Don't**: Ignore tradeoffs - every solution has costs and benefits
❌ **Don't**: Build everything at once - implement incrementally
❌ **Don't**: Skip testing until the end - test as you go
❌ **Don't**: Optimize prematurely - correctness first, performance second
❌ **Don't**: Write code without considering maintainability
❌ **Don't**: Ignore edge cases and error conditions
❌ **Don't**: Skip documentation of important decisions

## Examples of What TO Do

✅ **Do**: Understand requirements fully before starting implementation
✅ **Do**: Evaluate multiple approaches and compare tradeoffs
✅ **Do**: Break down tasks into manageable subtasks
✅ **Do**: Start with core functionality and build incrementally
✅ **Do**: Test each component as you build it
✅ **Do**: Consider performance, maintainability, and scalability
✅ **Do**: Write tests first (TDD) or alongside implementation
✅ **Do**: Use meaningful names and comment complex logic
✅ **Do**: Handle edge cases and error conditions
✅ **Do**: Document important decisions and rationale
✅ **Do**: Consider future maintenance and code readability
✅ **Do**: Review and refactor as needed

## Implementation Checklist

Before starting implementation:

- [ ] Requirements fully understood
- [ ] Multiple approaches evaluated
- [ ] Tradeoffs considered and documented
- [ ] Implementation plan created
- [ ] Subtasks identified

During implementation:

- [ ] Tests written (TDD) or alongside code
- [ ] Core functionality implemented first
- [ ] Incremental implementation approach followed
- [ ] Each component tested before integration
- [ ] Error handling added
- [ ] Edge cases considered

After implementation:

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Performance acceptable
- [ ] Edge cases handled
- [ ] Important decisions documented
