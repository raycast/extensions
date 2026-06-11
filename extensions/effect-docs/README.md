<!-- Header -->
<div align="center">
    <h1>Effect Docs</h1>
    <p>
        Search Effect documentation with speed, focus, and intentionality
        <br />
        <a href="#features">Features</a>
        ·
        <a href="#commands">Commands</a>
        ·
        <a href="#ai-extension">AI Extension</a>
    </p>
</div>

## About

This extension keeps Effect documentation close without trying to replace the docs themselves. The goal is to make discovery feel natural: search quickly, open the source of truth in the browser, and copy the small pieces that help you stay in flow.

The design prioritizes **intentionality** over novelty. Guides and API reference entries live in one focused command, while AI support remains a helpful layer for explanations rather than the primary way to read documentation.

## Features

- **Focused Documentation Search**
    - Search Effect guides and API reference from Raycast
    - Switch between all results, guides, and API reference
    - Paginated custom results keep the command responsive with thousands of API entries

- **Clean API Discovery**
    - API entries show their module as a subtitle for quick scanning
    - Effect module results are prioritized first
    - Search prioritizes direct title and API name matches over broad description matches

- **Useful Actions**
    - Open documentation pages in the browser
    - Copy module import statements
    - Copy documentation URLs
    - Ask AI to explain a guide or API entry when more context is helpful

- **AI-Assisted Learning**
    - Ask freeform Effect questions with Ask Effect Docs
    - Use `@effect-docs` in Raycast AI Chat
        - Search guides and API reference through AI tools

## Commands

### Search Docs

Searches Effect guides and API reference entries in one place.

Use the dropdown in the search bar to choose a scope:

- All results
- Guides
- API Reference

API results use the module name as a subtitle, making entries like `Effect.flatMap`, `Array.flatMap`, and `Option.flatMap` easier to distinguish at a glance.

> [!NOTE]
> Documentation pages open in the browser to preserve the original formatting and avoid rendering dense docs inline.

### Ask Effect Docs

Ask a freeform question about Effect and receive a concise answer with practical TypeScript examples.

Example questions:

- `How do I handle errors?`
- `What is the difference between Effect.gen and pipe?`
- `When should I use Layer?`

> [!IMPORTANT]
> Raycast AI access requires Raycast Pro. If AI is unavailable, the command shows a fallback message and a link to the Effect Discord.

## AI Extension

Effect Docs includes AI tools that work inside Raycast AI Chat.

Try prompts such as:

- `@effect-docs how do I handle errors?`
- `@effect-docs explain Effect.flatMap`
- `@effect-docs when should I use Layer?`
- `@effect-docs search the API for Schedule`

The AI extension can search:

- Effect guides for concepts, tutorials, and patterns
- Effect API reference for modules, functions, and types

## Actions

### Guide Results

| Action          | Description                            |
| --------------- | -------------------------------------- |
| Open in Browser | Open the guide on the Effect website   |
| Explain with AI | Ask Raycast AI for a short explanation |
| Copy URL        | Copy the guide URL                     |

### API Reference Results

| Action             | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| Open in Browser    | Open the API reference page                                      |
| Explain with AI    | Ask Raycast AI for a short explanation and example               |
| Copy Module Import | Copy an import such as `import * as Effect from "effect/Effect"` |
| Copy URL           | Copy the API reference URL                                       |

### Search Scope Shortcuts

| Shortcut | Action             |
| -------- | ------------------ |
| `⌘` `1`  | Show all results   |
| `⌘` `2`  | Show guides        |
| `⌘` `3`  | Show API reference |

## Data Sources

Effect Docs uses public documentation sources:

- Guides from `https://effect.website/llms.txt`
- API reference from `https://tim-smart.github.io/effect-io-ai/`

Results are cached locally to keep the extension fast and reduce network requests. Stale cached results are returned immediately while the cache refreshes in the background.

## Notes

- AI features require Raycast Pro.
- Search results are paginated to keep Raycast responsive with the large Effect API surface.
- The extension favors opening official documentation in the browser instead of attempting to reformat docs inline.
