<div align="center">
    <br/>
    <br/>
    <img src="./assets/extension-icon.png" alt="JSON Resume" width="100"/>
    <h3>JSON Resume</h3>
    <p>Parse JSON Resume</p>
    <p align="center">
        <a href="https://buymeacoffee.com/0xdhrv"><img alt="Buy Me a Coffee" src="https://shieldcn.dev/badge/buymecoffee-FFDD04.svg?size=default&amp;theme=neutral&amp;logo=buymeacoffee" /></a>
        <a href="https://github.com/0xdhrv"><img alt="GitHub" src="https://shieldcn.dev/badge/github-181717.svg?size=default&amp;theme=neutral&amp;logo=github" /></a>
        <a href="https://x.com/0xdhrv"><img alt="Twitter" src="https://shieldcn.dev/badge/twitter-1DA1F2.svg?size=default&amp;theme=neutral&amp;logo=x" /></a>
    </p>
    <br/>
    <br/>
</div>

A small utility and UI for parsing, validating and viewing resumes in the JSON Resume format.

What is JSON Resume?

JSON Resume is an open-source standard for storing resume/CV data as structured JSON. It lets tools validate, transform, and render resumes consistently across platforms.

How this project works

- Load: the UI accepts a resume document in the JSON Resume format (a JSON file/object).
- Validate: resumes are checked against the JSON Resume schema (https://jsonresume.org/schema) and the TypeScript types in `src/types/`; the validator is in `src/utils/validateResume.ts`.
- Store: simple local storage helpers in `src/utils/storage.ts` keep resumes available between sessions.
- Render/Search: UI components in `src/` (for example `open-resume.tsx` and `search-resumes.tsx`) provide basic viewing and searching functionality.

## Key features

- Schema validation against the JSON Resume types.
- Small React/TypeScript UI components for opening and searching resumes.
- Lightweight local storage helpers for saving and loading resumes.

## Project layout

- `src/` — source files and UI components.
- `src/utils/` — helpers such as `validateResume.ts` and `storage.ts`.
- `src/types/` — JSON Resume schema and TypeScript definitions.

