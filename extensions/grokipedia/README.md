# Grokipedia

Grokipedia is a lightweight search and knowledge-preview extension built to expose Grokipedia's content and search capabilities to Raycast AI tools and other integrations.

This repository contains the API client, Raycast tools, and utilities used to query and present Grokipedia data.

## Highlights

- Full-text search and typeahead tools for quick article lookup
- Per-page fetching with optional content, link validation, and citations
- Small, dependency-free fetch-based API client using a shared `buildUrl` helper

## Repository layout

- `src/` — TypeScript source files (API client, transforms, utilities)
- `src/tools/` — Raycast AI Tool implementations that wrap Grokipedia endpoints
- `assets/` — Static assets used by the tools
- `package.json`, `tsconfig.json` — project metadata and TypeScript config

## Tools

See `src/tools/README.md` for details about the Raycast AI tools included in this project (inputs, outputs, and examples).