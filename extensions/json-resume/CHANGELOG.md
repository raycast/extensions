# Changelog

## [Save, Edit, and Manage Resumes Locally] - 2026-10-21

- Store complete JSON Resume documents inside the extension and view them offline.
- Add a shared create/edit JSON form, local resume search, copy JSON, and confirmed deletion.
- Preserve URL bookmarks and add Save Local Copy for validated remote resumes.
- Add AI tools to list, read, save, update, and delete local documents, with mutation confirmations.

## [Schema Rendering and AI Tool Fixes] - 2026-10-13

- Share schema-compatible rendering across both resume commands, including projects, volunteer work, awards, certificates, publications, interests, and references.
- Render URL, score, work name, education details, and complete skill lists while retaining legacy website, company, and GPA aliases.
- Validate the calling AI model’s extracted JSON without nested model requests or automatic clipboard changes.
- Confirm explicitly requested file saves and preserve existing files.
- Add synthetic regression tests for optional fields, sections, validation, and tool side effects.

## [Initial Version] - 2025-11-11

- Initial public release
- Added JSON Resume parsing and validation utilities
- Included UI components to open and search resumes (`open-resume.tsx`, `search-resumes.tsx`)
- Utilities: `src/utils/storage.ts`, `src/utils/validateResume.ts`
