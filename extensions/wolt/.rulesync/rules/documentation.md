---
targets:
  - "*"
root: false
description: "Guidelines for maintaining up-to-date technical documentation in the docs/ directory"
globs:
  - "docs/**/*.md"
  - "**/*.md"
cursor:
  alwaysApply: true
  globs:
    - "docs/**/*"
---

# Project Documentation

**CRITICAL**: Always maintain up-to-date technical documentation organized in `.md` files under the `docs/` directory. Keep documentation concise and well-organized - avoid over-documentation. Focus on essential knowledge that helps team members and AI agents understand the project.

## Core Principle

Technical documentation should be organized, accessible, and current. Documentation serves as a knowledge base for team members and AI agents working on the project. Keep it concise and focused on essential information - avoid creating excessive documentation that becomes hard to maintain.

## Required Documentation Structure

Maintain four core documentation files in the `docs/` directory:

### 1. `docs/PROJECT.md` - Project Overview

**Purpose**: Outward-facing overview of the project for new team members (especially PMs) to understand the project quickly.

**Content should include**:

- **Project goals and purpose**: What is this project trying to achieve?
- **Important systems and logic**: Key architectural decisions, important business logic, critical workflows
- **External dependencies**: Third-party services, APIs, libraries, and their purposes
- **Key stakeholders and contacts**: Who to reach out to for different areas
- **Reference to technical docs**: Brief mention that technical details are in `TECHNICAL_DOCS.md`

**Tone**: Clear, accessible to both technical and non-technical readers. Focus on "what" and "why" rather than deep technical "how".

### 2. `docs/TECHNICAL_DOCS.md` - Technical Documentation

**Purpose**: Comprehensive technical reference for developers and AI agents working on the codebase.

**Content should include**:

- **Tech stack**: Programming languages, frameworks, libraries, and their versions
- **Directory structure**: Overview of the project structure with explanations of key directories
- **Important files**: References to critical files and their purposes
- **Architecture patterns**: Key architectural patterns and conventions used in the codebase
- **Development setup**: How to set up the development environment
- **Build and deployment**: Build processes, deployment procedures
- **API documentation**: If applicable, overview of API structure and conventions
- **Database schema**: If applicable, overview of database structure
- **Configuration**: Important configuration files and their purposes

**Tone**: Technical, detailed, reference-style. Focus on "how" and concrete implementation details.

### 3. `docs/CURRENT_STATE.md` - Session State Scratchpad

**Purpose**: A scratchpad for AI agents to maintain continuity between sessions and track current work.

**Content should include**:

- **Current efforts**: What work is actively in progress?
- **In-progress items**: Tasks that are partially complete
- **Next steps**: Planned actions and priorities
- **Blockers**: Issues preventing progress
- **Recent changes**: Important updates made in recent sessions
- **Context notes**: Important context that might be needed in future sessions

**Tone**: Informal, practical. This is a working document that should be updated frequently as work progresses.

**Maintenance**: Update this file at the end of each significant work session to preserve context for future sessions.

### 4. `docs/DESIGN.md` - Design Language

**Purpose**: Central reference for UI design language, visual identity, and design system.

**Content should include**:

- **Color palette**: Primary, secondary, accent colors with hex codes
- **Typography**: Font families, sizes, weights, and usage guidelines
- **Theme configuration**: Light/dark mode settings, theme variables
- **Component patterns**: Common UI patterns and their usage
- **Spacing system**: Grid, padding, margin conventions
- **Design tokens**: Reusable design values (if applicable)
- **Brand guidelines**: Logo usage, brand colors, visual identity rules

**Tone**: Reference-style, precise. Include actual values (hex codes, sizes, etc.) for easy reference.

## Documentation Maintenance Workflow

### When to Update Documentation

1. **After significant architectural changes**: Update `PROJECT.md` when systems change, and `TECHNICAL_DOCS.md` when technical details change
2. **When tech stack changes**: Update `TECHNICAL_DOCS.md` with new technologies, dependencies, or versions
3. **At the end of work sessions**: Update `CURRENT_STATE.md` to preserve context
4. **When design changes**: Update `DESIGN.md` when colors, themes, or design system evolves
5. **When onboarding new team members**: Review and update `PROJECT.md` and `TECHNICAL_DOCS.md` for clarity

### How to Update Documentation

1. **Read existing documentation first**: Understand current state before making changes
2. **Update relevant sections**: Modify only what has changed, preserve what's still accurate
3. **Keep it concise**: Remove outdated information, avoid redundancy
4. **Use clear structure**: Use headings, lists, and formatting for readability
5. **Include practical examples**: Reference actual files, code, or values when helpful

### Documentation File Management

- **Create `docs/` directory** if it doesn't exist
- **Use standard markdown formatting**: `.md` extension, proper headings, lists
- **Keep files focused**: Each file has a specific purpose - don't mix concerns
- **Version control**: Commit documentation updates alongside code changes

## Examples of What NOT to Do

❌ **Don't**: Create dozens of documentation files - keep it to the four core files
❌ **Don't**: Write documentation that duplicates code comments - focus on higher-level concepts
❌ **Don't**: Leave outdated information in documentation - remove or update stale content
❌ **Don't**: Create documentation that's longer than necessary - be concise
❌ **Don't**: Mix different concerns in one file - keep PROJECT.md, TECHNICAL_DOCS.md, CURRENT_STATE.md, and DESIGN.md separate
❌ **Don't**: Put technical details in PROJECT.md - use TECHNICAL_DOCS.md for all technical documentation
❌ **Don't**: Skip updating CURRENT_STATE.md between sessions - this breaks continuity
❌ **Don't**: Write documentation without reading existing docs first - maintain consistency
❌ **Don't**: Create documentation files outside the `docs/` directory - keep it organized
❌ **Don't**: Document implementation details that are obvious from code - focus on "why" and "what"

## Examples of What TO Do

✅ **Do**: Maintain exactly four core documentation files: `PROJECT.md`, `TECHNICAL_DOCS.md`, `CURRENT_STATE.md`, `DESIGN.md`
✅ **Do**: Update `CURRENT_STATE.md` at the end of significant work sessions
✅ **Do**: Keep `PROJECT.md` accessible to non-technical readers (PMs, stakeholders) - avoid technical details
✅ **Do**: Put all technical documentation in `TECHNICAL_DOCS.md` - tech stack, directory structure, important files
✅ **Do**: Include actual values in `DESIGN.md` (hex codes, sizes, etc.) for easy reference
✅ **Do**: Read existing documentation before updating to maintain consistency
✅ **Do**: Remove outdated information when updating documentation
✅ **Do**: Keep documentation concise and focused on essential information
✅ **Do**: Organize all documentation under the `docs/` directory
✅ **Do**: Update documentation alongside code changes when relevant
✅ **Do**: Use clear headings and formatting for readability

## File Structure Example

```
project-root/
├── docs/
│   ├── PROJECT.md          # Outward-facing project overview
│   ├── TECHNICAL_DOCS.md    # Technical documentation and reference
│   ├── CURRENT_STATE.md    # Session state and work in progress
│   └── DESIGN.md           # Design language and UI guidelines
└── ...                     # Other project files
```

## Common Pitfalls

- **Over-documentation**: Creating too many files or excessive detail that becomes hard to maintain
- **Under-documentation**: Skipping updates, leaving stale information, or missing critical context
- **Wrong audience**: Writing `PROJECT.md` too technically or `DESIGN.md` too abstractly
- **Stale information**: Forgetting to update `CURRENT_STATE.md` between sessions
- **Mixed concerns**: Putting technical details in `PROJECT.md` instead of `TECHNICAL_DOCS.md`, or mixing design info in project docs
- **Missing values**: Documenting design without actual hex codes, sizes, or concrete values

## Summary

1. **Maintain four core files** - `PROJECT.md`, `TECHNICAL_DOCS.md`, `CURRENT_STATE.md`, `DESIGN.md` in the `docs/` directory
2. **Keep it concise** - Focus on essential information, avoid over-documentation
3. **Separate concerns** - `PROJECT.md` for outward-facing overview (non-technical), `TECHNICAL_DOCS.md` for all technical details
4. **Update regularly** - Keep documentation current, especially `CURRENT_STATE.md` between sessions
5. **Know your audience** - `PROJECT.md` for PMs/stakeholders, `TECHNICAL_DOCS.md` for developers, `DESIGN.md` for UI work, `CURRENT_STATE.md` for agents
6. **Stay organized** - Keep all documentation under `docs/`, use clear structure and formatting
7. **Remove stale content** - Update or remove outdated information when making changes
