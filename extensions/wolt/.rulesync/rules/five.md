---
targets:
  - "*"
root: false
description: "Explain 'Five Whys' debugging method to agents"
globs:
  - "**/*"
cursor:
  alwaysApply: true
  globs:
    - "**/*"
---

# Five Whys Analysis

**CRITICAL**: Always use the "Five Whys" root cause analysis technique to deeply understand problems before implementing solutions. Never treat symptoms without identifying root causes.

## Core Principle

The Five Whys technique helps identify the underlying root cause of a problem by asking "Why?" five times. This prevents addressing symptoms instead of the actual problem, which leads to recurring issues and wasted effort.

## Required Workflow

### 1. Define the Problem

- **Clearly state the issue or symptom**: What is the observable problem?
- **Gather context**: What happened? When? Under what conditions?
- **Avoid assumptions**: Start with facts, not theories

### 2. Ask "Why?" Five Times

- **Why did this problem occur?** → Answer 1
- **Why did Answer 1 happen?** → Answer 2
- **Why did Answer 2 happen?** → Answer 3
- **Why did Answer 3 happen?** → Answer 4
- **Why did Answer 4 happen?** → Answer 5 (Root Cause)

Continue asking "Why?" until you reach a root cause that cannot be further decomposed or points to a fundamental issue.

### 3. Validate Root Cause

- **Verify the logical chain**: Does each "Why?" logically lead to the next?
- **Check if addressing root cause prevents recurrence**: Will fixing this prevent the problem?
- **Consider multiple root causes**: Some problems have multiple contributing factors
- **Test your hypothesis**: Can you verify the root cause is correct?

### 4. Develop Solutions

- **Address the root cause, not just symptoms**: Fix the fundamental issue
- **Create preventive measures**: Prevent the root cause from occurring again
- **Consider systemic improvements**: Look for patterns that need broader fixes
- **Plan implementation**: How will you address the root cause?

## Examples of What NOT to Do

❌ **Don't**: Fix symptoms without understanding root causes (e.g., add error handling without fixing the bug)
❌ **Don't**: Stop at the first "Why?" - dig deeper to find the real issue
❌ **Don't**: Assume you know the root cause without going through the process
❌ **Don't**: Accept "because it's always been that way" as a root cause
❌ **Don't**: Blame people or external factors without understanding systemic issues
❌ **Don't**: Skip validation - verify your root cause is actually correct
❌ **Don't**: Address only one root cause when multiple factors contribute

## Examples of What TO Do

✅ **Do**: Ask "Why?" five times (or more) to reach the root cause
✅ **Do**: Document each step of the analysis for clarity
✅ **Do**: Verify the logical chain connects each "Why?" to the next
✅ **Do**: Consider multiple root causes when applicable
✅ **Do**: Address root causes, not just symptoms
✅ **Do**: Create preventive measures to avoid recurrence
✅ **Do**: Test your root cause hypothesis before implementing solutions
✅ **Do**: Look for systemic patterns that need broader fixes

## Example Analysis

**Problem**: Application crashes when processing large files

1. **Why?** → The application runs out of memory
2. **Why?** → It loads entire file into memory at once
3. **Why?** → The file parser wasn't designed for streaming
4. **Why?** → Initial requirements only specified small files
5. **Why?** → Requirements gathering didn't consider future growth

**Root Cause**: Incomplete requirements gathering process

**Solution**:

- Implement streaming parser (addresses immediate issue)
- Improve requirements gathering process (prevents recurrence)
- Add capacity planning to requirements process (systemic improvement)

## Summary

1. **Always use Five Whys** - Ask "Why?" five times (or more) to reach the root cause before implementing solutions
2. **Define the problem clearly** - Start with observable facts, not assumptions
3. **Validate the root cause** - Verify the logical chain and test your hypothesis
4. **Address root causes, not symptoms** - Fix fundamental issues to prevent recurrence
5. **Create preventive measures** - Implement systemic improvements to avoid future problems
6. **Consider multiple root causes** - Some problems have multiple contributing factors
