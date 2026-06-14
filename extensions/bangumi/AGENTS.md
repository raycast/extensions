# Bangumi Raycast Extension Agent Guidelines

## Project Overview

This repository contains the Bangumi extension for Raycast. It integrates with Bangumi (bgm.tv), allowing users to search for subjects (anime, manga, games, etc.), manage their collections, and view episode statuses directly within Raycast. The extension is built using the `@raycast/api`, `@raycast/utils`, and React.

**Key Context:**

- **API Interoperability:** Uses the Bangumi OpenAPI. Ensure robust error handling and type safety when parsing API responses.
- **UI/UX Consistency:** Relies strictly on Raycast UI components (`List`, `Grid`, `Detail`, `Form`, `ActionPanel`). Adheres to Raycast's design patterns (e.g., loading states, empty views, metadata).
- **Authentication & Data:** Manages user authentication securely. Uses Raycast's built-in preference and caching mechanisms instead of custom implementations.

## Agent Skills

Apply the `bangumi` and `raycast-extension` skills when needed.

## Code Guidelines

### Type Safety

- **Strict Schema Usage:** Treat the OpenAPI-generated types (`src/types/generated.ts`) as the source of truth. Do not add unnecessary optional chaining (`?.`) or fallback operators (`??`, `||`) to properties that the schema marks as required (e.g., `data.collection.doing`, `data.tags`, `data.rating`). Trust the generated types: redundant null checks reduce readability, weaken type guarantees, and can hide data contract violations that should be addressed explicitly.

- **TypeScript Interfaces:** Do not manually define `Preferences` or `Argument` interfaces. Use `getPreferenceValues<Preferences>()` as types are auto-generated in `raycast-env.d.ts`.
