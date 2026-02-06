---
name: architecture
description: "Develop comprehensive specs for new Raycast extension features using iterative refinement. Use this skill when: (1) Starting a new feature or command, (2) Planning extension architecture, (3) You need a structured approach to spec creation with review and refinement. Creates polished, production-ready specifications through multiple iterations."
argument-hint: "[feature-requirements]"
---

# Architecture Spec Development Skill (Raycast Extension)

Develop a kickass spec for a new Raycast extension feature using an iterative multi-pass approach with documentation fetching and code review refinement.

## Raycast Extension Context

This project is a **Raycast extension** built with TypeScript and React. All architecture decisions must follow Raycast's patterns and APIs.

### Tech Stack
- **Runtime**: Node.js 22.14+, TypeScript, React
- **Framework**: Raycast API (`@raycast/api`)
- **Utilities**: `@raycast/utils` (useFetch, usePromise, useCachedPromise, useForm, etc.)
- **UI**: Raycast built-in components (List, Detail, Grid, Form, ActionPanel)
- **Storage**: Raycast LocalStorage (small data), Node.js fs with `environment.supportPath` (large data)

### Project Structure Convention
```
my-extension/
  package.json         # Manifest: commands, preferences, metadata
  src/
    index.tsx          # Default command (name maps to source file)
    other-command.tsx   # Additional commands
  assets/
    icon.png           # Extension icon (512x512 PNG)
  raycast-env.d.ts     # Auto-generated TypeScript types
```

### Key Raycast Patterns
- Commands export a default React component (mode: "view") or async function (mode: "no-view")
- Use `LaunchProps` for typed command arguments and draft values
- Preferences are declared in `package.json` and accessed via `getPreferenceValues<Preferences>()`
- Navigation uses `Action.Push` (preferred) or `useNavigation()` hook
- Error feedback via `showToast({ style: Toast.Style.Failure, ... })`
- Loading states via `isLoading` prop on top-level components
- Built-in filtering on List/Grid (avoid custom filtering unless API-backed search)
- Actions live in `ActionPanel` inside component `actions` prop

## Steps

Here is the requirements prompt: $ARGUMENTS

### 1. Clarify the requirements

First, evaluate whether the requirements document requires any clarification. If it does, ask the user before proceeding, and append the clarifications to the requirements document in a ## Clarifications section.

Unless the requirements are extremely clear upfront, you should always ask at least 3 clarifying questions - ideally, select the ones which are most likely to reduce ambiguity and result in a great spec.

Consider asking about:
- **Commands**: How many commands? What modes (view, no-view, menu-bar)?
- **UI approach**: List vs Detail vs Form vs Grid? Need `isShowingDetail`?
- **Data flow**: Where does data come from? API, local computation, clipboard, selected text?
- **Arguments vs Preferences**: What's entered per-use (arguments) vs configured once (preferences)?
- **Actions**: What can users do with results? Copy, open, paste, push to detail?
- **Edge cases**: Invalid input handling, empty states, offline behavior
- **Performance**: Real-time search vs static list? Caching needs?

### 2. Fetch documentation

Once you are happy with the basic requirements, decide whether it requires documentation in addition to what is present in the codebase. If it does, fetch the relevant documentation and summarize it.

Key Raycast documentation sources:
- https://developers.raycast.com/ — Main docs
- https://developers.raycast.com/api-reference/user-interface — UI components
- https://developers.raycast.com/api-reference/user-interface/list — List API
- https://developers.raycast.com/api-reference/user-interface/detail — Detail API
- https://developers.raycast.com/api-reference/preferences — Preferences API
- https://developers.raycast.com/information/best-practices — Best practices
- https://developers.raycast.com/information/manifest — package.json manifest

### 3. First iteration of the spec

Create a first iteration of the spec. The spec should cover:

- **Extension Manifest**: `package.json` configuration — commands, arguments, preferences, categories, icons
- **Command Architecture**: Entry points, modes, how commands relate to each other
- **UI Design**: Which Raycast components to use, layout decisions, what goes in accessories vs detail panels
- **Data Layer**: Data sources, transformations, caching strategy
- **Action Design**: ActionPanel contents, keyboard shortcuts, copy/paste/open behaviors
- **Type Definitions**: Key interfaces and types
- **Error & Loading States**: Toast messages, empty views, loading indicators

The first iteration should end up in a file named `YYMMDD-XXa-spec-headline.md` in a `/docs/plans/` folder.

### 4. Refine the spec

Review the first iteration with exacting standards for:
- Proper use of Raycast API patterns (not reinventing what the framework provides)
- Correct component choices (List vs Detail vs Form for the use case)
- Appropriate use of built-in filtering vs custom search
- Proper preference vs argument distinction
- Action design follows Raycast conventions (first action is default, proper shortcuts)
- No over-engineering — Raycast extensions should be fast and focused
- Accessibility and keyboard-first UX

Write all review comments in a file named `YYMMDD-XXa-spec-headline-review-feedback.md` in the `/docs/plans/` folder.

### 5. Second iteration of the spec

Take the first iteration, documentation, requirements, and review comments to create a second iteration, applying feedback.

Focus on:
- Simplifying any over-engineered solutions
- Using Raycast built-in utilities (`@raycast/utils` hooks) instead of custom implementations
- Ensuring the extension feels native to Raycast
- Removing unnecessary abstractions

The second iteration should be called `YYMMDD-XXb-spec-headline.md` in the `/docs/plans/` folder.

### 6. Refine the spec again

Repeat the review process for the second iteration.

### 7. Third iteration of the spec

Apply the second round of feedback to create the final spec iteration: `YYMMDD-XXc-spec-headline.md`.

### 8. Pause and notify the user that the spec is ready for review

The user will want to review the spec in detail before proceeding to implementation.

In your notification, summarize the key, final components of the spec at a very high level (3 paragraphs max), and also summarize the key changes that were made thanks to the review suggestions (also 3 paragraphs max). Use paragraphs rather than bullet points.

### 9. Afterwards: build the feature

When building the feature, follow these Raycast-specific conventions:
- One command per source file, named to match the `name` field in `package.json`
- Use `@raycast/api` imports for all UI components and APIs
- Use `@raycast/utils` hooks for data fetching and form handling
- Keep components focused — extract sub-components for detail views
- Test with `npm run dev` and hot-reload in Raycast
- Run `npm run build` to verify before considering done

Once they have finished building the feature, please review the code output yourself to ensure it meets high standards and hasn't deviated substantially from the spec without good cause.

## Output Format

Throughout this process, maintain clear documentation:

1. **Spec Files**: `YYMMDD-XXa/b/c-spec-headline.md` — Each iteration of the spec
2. **Review Files**: `YYMMDD-XXa/b-spec-headline-review-feedback.md` — Feedback for each iteration
3. **Final Summary**: A concise notification to the user summarizing the spec and key improvements

---

Remember: Raycast extensions should feel **fast, focused, and native**. The spec should produce an extension that launches instantly, handles errors gracefully with toasts, and puts the most useful action first. Every abstraction must earn its place.
