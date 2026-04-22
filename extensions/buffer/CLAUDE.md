# Buffer Raycast — Project Memory

This repository is a Raycast extension for Buffer. It exposes both interactive Raycast commands and AI tools for inspecting a Buffer account, listing channels and posts, creating content, and deleting scheduled or draft items.

## What matters most

- Stack: TypeScript + React + Raycast API.
- API integration lives in `src/utils/buffer-api.ts` and is the main backend boundary.
- Shared domain types live in `src/utils/types.ts`.
- UI helpers live in `src/utils/helpers.ts`.
- AI tool channel resolution logic lives in `src/tools/shared.ts`.
- Authentication depends on one Raycast preference: `accessToken`.

## Architecture summary

- `package.json` defines 8 Raycast commands and 9 AI tools.
- View commands are implemented in `src/*.tsx`.
- AI tools are implemented in `src/tools/*.ts`.
- Buffer communication is GraphQL-based and centralized in `gql()` inside `src/utils/buffer-api.ts`.
- Post retrieval is normalized through `getPosts()` and specialized via `getScheduledPosts()`, `getSentPosts()`, and `getDraftPosts()`.
- Post creation and idea creation are centralized in `createPost()` and `createIdea()`.

## Stable product rules

- Prefer active channels over disconnected or locked ones.
- Keep user-provided post text unchanged unless the user explicitly asks to rewrite it.
- Do not cross-post to multiple channels unless explicitly requested.
- Use draft mode when the user wants to save without publishing.
- Use the idea flow when the user is capturing ideas rather than scheduling a post.

## Current implementation assumptions

- Most views and tools default to the first organization in `account.organizations`.
- Channel matching supports exact and partial search across id, name, display name, and service.
- Scheduled, sent, and draft views group posts by channel.
- Buffer asset support currently allows either one image URL or one video URL, but not both at once.
- Facebook posts receive special metadata in `buildPostMetadata()`.

## Known limitations

- No automated tests are present in the repo.
- Pagination is supported by the API layer but not fully surfaced in the UI.
- Organization selection is not consistently user-driven; many flows assume the first organization.
- List views for scheduled, sent, and draft posts share patterns that could later be abstracted.

## Maintenance rules for future sessions

- Update this file only with high-signal, stable truths.
- Record architectural decisions in `.claude/decisions.md`.
- Record ongoing session notes, pending work, and discoveries in `.claude/worklog.md`.
- Keep deeper architectural context in `.claude/project-memory.md`.
- When changing GraphQL fields, keep `src/utils/buffer-api.ts` and `src/utils/types.ts` in sync.

## Useful commands

- `npm run lint`
- `npm run build`
- `npm run dev`

## External Claude settings note

The file `/Users/carlosperez/Downloads/.claude/settings.local.json` currently acts as a permissions file, not as durable project memory. The durable memory for this repo now lives inside the repository through this `CLAUDE.md` file and the `.claude/` folder.
