# Principles

- **No comments.** Names and small functions carry the meaning. A comment is
  allowed only for a _why_ the code can't express, such as a workaround or a
  spec quirk, and then it's one line. Never narrate _what_ the code does.
- **Small, cohesive files.** One concern per file. Keep tightly coupled code
  together, but don't split just to split.
- **Validate at the boundaries.** Parse untrusted input once at the edge with
  Zod, then trust the types inside. Never re-validate downstream.
- **Guard clauses over nesting.** Handle edge cases with an early `return` or
  `throw`. Keep the happy path flat and last.
- **The toolchain enforces style.** ESLint + Prettier via `ray lint`; run
  `pnpm fix-lint`; never hand-format.
- **No barrels.** Import from the source file. Use relative imports; keep
  `src/` shallow. A `../../..` chain is a smell.
- **Errors speak human.** Every failure the user sees names the instance and
  the fix, e.g. `https://memos.example.com rejected the access token…`, never
  `Request failed`.
- **Memos is the source of truth.** The extension keeps no copy of memo
  content beyond `@raycast/utils` caching; destructive actions (delete,
  archive) use `confirmAlert`.
- **Keep the scope tight.** Build what the task needs. A pattern goes into
  `src/helpers/` only once it's proven and reusable.
