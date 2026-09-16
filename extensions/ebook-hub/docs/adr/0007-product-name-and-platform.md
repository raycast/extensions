# ADR-0007: Product Name, Platform, and Language Scope

- Status: Accepted
- Date: 2026-09-15

## Context

The working name was "E-Books". Raycast Store guidelines discourage generic
names, the store supports US English UI only, and Raycast now runs on macOS
and Windows.

## Decision

- **Name**: *Ebook Hub*, package name `ebook-hub`. "Hub" signals the community
  library, which distinguishes it from a plain reader.
- **Platform**: macOS only for the MVP. The theme deeplink (ADR-0001) and the
  `ctrl` keymap (ADR-0003) are verified on macOS only.
- **UI language**: US English, per store rules. Book content can be in any
  language; language metadata uses BCP 47 tags.
- **Search**: diacritic-insensitive (`NFD`, strip combining marks, `đ → d`),
  so Vietnamese titles match unaccented queries.

## Consequences

- A reviewer may still ask for a more specific name; "Ebook Hub" is the
  fallback-safe choice we defend.
- Adding Windows requires verifying the deeplink format and redefining
  shortcuts with the `{ macOS, Windows }` form.

## Alternatives Considered

- **E-Books** — too generic for store review. Rejected.
- **Localized UI** — not supported by Raycast. Rejected.
