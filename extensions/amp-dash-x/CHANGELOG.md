# Changelog

All notable changes to the Amp Dash X Raycast extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Updated command icon to optimized version (reduced file size from 39KB to 10KB)
- Enhanced AGENT.md with additional architecture and development workflow documentation
- Updated package.json metadata for Raycast store preparation

## [1.0.0] - 2025-01-26

### Added
- Initial release of Amp Dash X Raycast extension
- Core functionality for organizing and executing Amp AI prompts with `-x` flag
- **Execute Amp Prompts** command (`amp`) - Run saved prompts with execute mode
- **Manage Prompt Categories** command (`categories`) - Add, edit, and delete prompt categories
- Prompt management system with local storage persistence
- Category-based prompt organization
- Support for custom Amp binary path configuration
- Support for additional default flags
- Comprehensive prompt library with predefined categories:
  - Code Generation & Development
  - Code Review & Analysis
  - Documentation & Comments
  - Testing & Quality Assurance
  - Debugging & Troubleshooting
  - Refactoring & Optimization
  - Architecture & Design
  - Security & Best Practices
  - DevOps & Deployment
  - Learning & Education
  - Project Management
  - Communication & Collaboration
- React-based UI components:
  - `PromptForm` - Form component for adding/editing prompts
  - `PromptList` - List component for displaying and managing prompts
- Core libraries:
  - Storage API for prompt persistence (`src/lib/storage.ts`)
  - Amp command execution wrapper (`src/lib/amp.ts`)
- TypeScript support with proper type definitions
- ESLint configuration with Raycast standards
- MIT License

### Technical Details
- Built on Raycast API v1.68.0
- TypeScript 5.2.2 with ES2019 target and CommonJS modules
- React 18 with JSX transform
- Local storage for prompt and category persistence
- Child process execution for `amp -x` commands
- Comprehensive error handling with custom AmpError class

---

## Version History

- **v1.0.0** (2025-01-26): Initial release with full prompt management and execution features
- **Unreleased**: Store preparation updates and optimizations
