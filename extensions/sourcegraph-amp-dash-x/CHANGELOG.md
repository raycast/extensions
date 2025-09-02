# Amp Dash X Changelog

## [1.1.0] - {PR_MERGE_DATE}

### Added
- AI utilities: list-prompts, run-prompt, add-prompt, update-prompt, delete-prompt, list-categories, add-category, update-category, delete-category, generate-prompt.
- AI evals for all utilities with mocks and example prompts; evals pass 100% via `npx ray evals`.
- Example prompts surfaced as suggested prompts for users of the AI extension.

### Changed

- add-prompt tool now returns a rich Markdown summary (title, category, optional description, prompt block) and a ready-to-run `amp -x` command after saving.

## [1.0.0] - 2025-09-01

### Added

- Initial Raycast extension for Amp Code prompts (2025-07-26)
- Core functionality for organizing and executing Amp AI prompts with `-x` flag
- **Execute Amp Prompts** command (`amp`) - Run saved prompts with execute mode
- **Manage Prompt Categories** command (`categories`) - Add, edit, and delete prompt categories
- Prompt management system with local storage persistence
- Category-based prompt organization
- Support for custom Amp binary path configuration
- Support for additional default flags
- React-based UI components:
  - `PromptForm` - Form component for adding/editing prompts
  - `PromptList` - List component for displaying and managing prompts
- Core libraries:
  - Storage API for prompt persistence (`src/lib/storage.ts`)
  - Amp command execution wrapper (`src/lib/amp.ts`)
- TypeScript support with proper type definitions
- ESLint configuration with Raycast standards
- MIT License
- Default prompts and categories for new users
- Changelog management prompt in default prompts

### Changed

- Updated AGENT.md, command icon, and package.json for store preparation (2025-07-31)
- Added project documentation and licensing files (2025-07-31)
- Added Raycast store submission assets and improved UI components (2025-07-31)
- Updated prompt management and category handling for store prep (2025-07-31)
- Updated components and configuration for store prep (2025-07-31)
- Updated README.md (2025-07-31)
- Added Raycast store metadata for amp-x extension (2025-07-31)
- Updated Raycast store metadata images (2025-07-31)
- Improved code formatting and organized imports (2025-07-31)

### Removed

- Old screenshots from project (2025-07-31)
- PR prompt from default prompts (2025-07-31)
