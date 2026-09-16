# ADR-0003: Vim Keybindings with Modifiers and Command Mode

- Status: Accepted
- Date: 2026-09-15

## Context

Ebook Hub targets Vim users. Raycast's `Keyboard.Shortcut` requires at least
one modifier, and `Detail` cannot capture raw key presses or show a search
bar. Single-key motions such as `j`, `k`, or `gg` are impossible.

## Decision

Map Vim motions onto `ctrl` chords in the reader action panel, and provide a
Command Mode for everything that needs typed input.

| Shortcut | Action | Vim analogy |
| --- | --- | --- |
| `ctrl+j` / `ctrl+k` | Next / previous page | `j` / `k` |
| `ctrl+d` / `ctrl+u` | Forward / back 5 pages | `ctrl-d` / `ctrl-u` |
| `ctrl+l` / `ctrl+h` | Next / previous chapter | `l` / `h` |
| `ctrl+o` | Jump back | `ctrl-o` |
| `ctrl+m` | Toggle bookmark | `m` |
| `ctrl+;` | Command Mode | `:` |
| `ctrl+/` | Search in book | `/` |
| `Enter` / `cmd+Enter` | Next / previous page | — |

Command Mode is a `List` whose search bar is parsed by
`src/domain/command.ts`:

- `:12` — page 12 of the current chapter
- `:c3` — chapter 3
- `:toc` — table of contents (also shown for empty input)
- `:bm` — bookmarks
- `:theme mua|huong|cung` — apply a Hue theme (ADR-0001)
- `/query` — diacritic-insensitive search across the book

All shortcuts are defined once in `src/keymap.ts`.

## Consequences

- Shortcut conflicts with Raycast or macOS global bindings must be verified
  manually, especially `ctrl+m` (Return in terminals) and `ctrl+h`.
- Users with Raycast's own navigation preferences keep native list navigation
  in Library, Browse, and Command Mode.
- The command parser is pure and unit tested.

## Alternatives Considered

- **Hijack a List search bar for single-key motions** (type `j`, clear the
  text) — fragile, flickers, and breaks search. Rejected.
- **`cmd`-based shortcuts** — collide with Raycast defaults (`cmd+k` opens the
  action panel). Rejected.
