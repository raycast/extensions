---
targets:
  - "*"
root: false
description: "Guidelines for checking project documentation before starting new tasks"
globs:
  - "**/*"
cursor:
  alwaysApply: true
  globs:
    - "**/*"
---

# Check Documentation Before Starting Tasks

**CRITICAL**: Always check the `docs/` directory before starting a new task to understand project context, current state, and technical details. This prevents working with outdated assumptions and ensures continuity with previous work.

## Core Principle

Project documentation in the `docs/` directory contains essential context that informs how tasks should be approached. Checking documentation first ensures you understand:

- The project's goals and current state
- Technical architecture and conventions
- Work that's already in progress
- Design patterns and UI guidelines
- Recent changes and important context

Starting tasks without checking documentation leads to:

- Duplicating work that's already in progress
- Making decisions that conflict with project architecture
- Missing important context from previous sessions
- Violating established design patterns or conventions

## Required Workflow

### Step 1: Check Documentation Before Starting

**Before beginning any new task**, read the relevant documentation files in `docs/`:

1. **Check if `docs/` directory exists**: If it doesn't exist, you may need to create it and initialize documentation
2. **Read `docs/CURRENT_STATE.md` first**: Understand what work is in progress, blockers, and next steps
3. **Read `docs/PROJECT.md`**: Understand project goals, important systems, and external dependencies
4. **Read `docs/TECHNICAL_DOCS.md`**: Understand tech stack, directory structure, architecture patterns, and important files
5. **Read `docs/DESIGN.md`** (if task involves UI): Understand design language, colors, themes, and component patterns

### Step 2: Determine if Documentation Check is Needed

**You may skip the documentation check only if**:

- The task instructions are **extremely explicit** and self-contained (e.g., "Add a comment to line 42 of file X")
- The task requires **no wider context** about the project, architecture, or current state
- The task is a **trivial, isolated change** that doesn't interact with other systems

**When in doubt, always check the documentation** - it's better to spend a minute reading than to make incorrect assumptions.

### Step 3: Use Documentation to Inform Your Approach

After reading the documentation:

- **Align with current state**: Don't duplicate work mentioned in `CURRENT_STATE.md`
- **Follow technical conventions**: Use patterns documented in `TECHNICAL_DOCS.md`
- **Respect design system**: Follow guidelines in `DESIGN.md` for UI work
- **Consider project goals**: Ensure your work aligns with goals in `PROJECT.md`
- **Update `CURRENT_STATE.md`**: After completing work, update the current state to reflect progress

### Step 4: Update Documentation if Needed

If you discover documentation is outdated or missing important information:

- **Update `CURRENT_STATE.md`**: Add notes about your work, blockers, or next steps
- **Update `TECHNICAL_DOCS.md`**: If you've made architectural changes or discovered important technical details
- **Update `DESIGN.md`**: If you've made design changes or discovered design patterns
- **Update `PROJECT.md`**: If project goals or important systems have changed

## Examples of What NOT to Do

❌ **Don't**: Start coding immediately without checking `docs/CURRENT_STATE.md` - you might duplicate work
❌ **Don't**: Make architectural decisions without reading `docs/TECHNICAL_DOCS.md` - you might violate conventions
❌ **Don't**: Create UI components without checking `docs/DESIGN.md` - you might use wrong colors or patterns
❌ **Don't**: Assume you know the project structure - always verify in `docs/TECHNICAL_DOCS.md`
❌ **Don't**: Skip documentation check for "simple" tasks - even simple tasks benefit from context
❌ **Don't**: Work on something already listed as "in progress" in `CURRENT_STATE.md`
❌ **Don't**: Ignore blockers mentioned in `CURRENT_STATE.md` - address them first
❌ **Don't**: Make changes that conflict with project goals in `PROJECT.md`

## Examples of What TO Do

✅ **Do**: Always read `docs/CURRENT_STATE.md` first to understand what's in progress
✅ **Do**: Check `docs/TECHNICAL_DOCS.md` before making architectural decisions
✅ **Do**: Read `docs/DESIGN.md` before creating or modifying UI components
✅ **Do**: Review `docs/PROJECT.md` to ensure your work aligns with project goals
✅ **Do**: Update `docs/CURRENT_STATE.md` after completing significant work
✅ **Do**: Check documentation even for seemingly simple tasks - context matters
✅ **Do**: Respect work already in progress mentioned in `CURRENT_STATE.md`
✅ **Do**: Address blockers before starting new work
✅ **Do**: Follow technical patterns documented in `TECHNICAL_DOCS.md`
✅ **Do**: Use design tokens and patterns from `DESIGN.md` for UI work

## When Documentation Check Can Be Skipped

You may skip the documentation check **only** for tasks that are:

1. **Extremely explicit**: The instructions contain all necessary information (e.g., "Change the text 'Hello' to 'Hi' on line 5 of `src/App.tsx`")
2. **Self-contained**: The task doesn't require understanding project architecture, current state, or design patterns
3. **Trivial and isolated**: The change doesn't interact with other systems or components

**Examples of tasks where documentation check can be skipped**:

- "Fix typo: change 'recieve' to 'receive' in `README.md`"
- "Add a comment explaining this function"
- "Update version number in `package.json`"

**Examples of tasks where documentation check is required**:

- "Add a new feature" (needs project context, current state, technical docs)
- "Fix a bug" (needs current state, technical docs to understand architecture)
- "Refactor component" (needs design docs, technical docs, current state)
- "Add new API endpoint" (needs technical docs, project goals, current state)
- "Update UI styling" (needs design docs, current state)

## Documentation Reading Order

When checking documentation, read in this order for maximum efficiency:

1. **`docs/CURRENT_STATE.md`** - Quick check for in-progress work and blockers
2. **`docs/PROJECT.md`** - Understand project goals and important systems
3. **`docs/TECHNICAL_DOCS.md`** - Understand technical architecture and conventions
4. **`docs/DESIGN.md`** - Only if task involves UI/design work

## Common Pitfalls

- **Assuming documentation is outdated**: Even if documentation seems outdated, read it first - it may still contain valuable context
- **Skipping for "quick" tasks**: Quick tasks often benefit most from context checks
- **Not updating after work**: Forgetting to update `CURRENT_STATE.md` after completing work breaks continuity
- **Reading only one file**: Different files contain different types of context - read all relevant ones
- **Ignoring blockers**: Starting new work when blockers are listed in `CURRENT_STATE.md`

## Summary

1. **Always check `docs/` before starting tasks** - Unless the task is extremely explicit and self-contained
2. **Read `CURRENT_STATE.md` first** - Understand what's in progress and any blockers
3. **Read relevant documentation** - `PROJECT.md` for goals, `TECHNICAL_DOCS.md` for architecture, `DESIGN.md` for UI
4. **Use documentation to inform approach** - Align with current state, follow conventions, respect design system
5. **Update documentation after work** - Keep `CURRENT_STATE.md` current, update other docs if needed
6. **When in doubt, check docs** - Better to spend a minute reading than make incorrect assumptions
