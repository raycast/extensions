# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Agent Instructions

**Read `agent.md` at the start of every session and after context updates.** It contains critical guidelines to prevent common mistakes (e.g., uncommitted files, formatting issues, verification steps).

## Project Overview

Raycast extension providing unified search across Chrome tabs, bookmarks, and history. Selecting a result either switches to an existing tab or opens the URL in Chrome.

## Documentation

- **PRD**: `docs/PRD.md` - Problem statement, user stories, acceptance criteria (including Raycast Store requirements)
- **Technical Architecture**: `docs/Tech Design.md` - Stack, data flow, design decisions
- **User README**: `README.md` - User-facing documentation for Raycast Store

**Workflow**:
1. Update `docs/PRD.md` with new or revised requirements — wait for user approval
2. Update `docs/Tech Design.md` with any architectural or design changes
3. Implement changes
4. Achieve ≥90% unit test coverage; all tests must pass
5. Functional QA: verify solution meets all acceptance criteria in PRD before presenting as complete

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development mode (registers extension in Raycast)
npm run build        # Build extension
npm run lint         # Run ESLint + Prettier
npm run fix-lint     # Auto-fix lint issues
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Architecture & Design Decisions

See `docs/Tech Design.md` for the full technical architecture, data flow, key design decisions, and explored alternatives.
