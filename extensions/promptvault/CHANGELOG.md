# Changelog

All notable changes to the PromptVault Raycast extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed duplicate keyboard shortcut conflict (`Cmd+Shift+A` was used for both "AI Fill" and "Show Archived")
- Removed manual `Preferences` type definition in favor of auto-generated types from Raycast manifest

## [1.0.0] - {PR_MERGE_DATE}

### Added

- **Browse Prompts**: Search and browse your PromptVault prompts
  - Filter by category
  - Search by name and description
  - View prompt details and content
  - Copy prompt to clipboard
  - Open prompt in browser
- **Quick Save Prompt**: Create new prompts directly from Raycast
  - Set name, content, description
  - Select category from dropdown
  - Add source URL
  - Tag picker with existing tags auto-completion
- **Variable Support**: Fill prompt variables before copying
  - Manual variable form
  - AI-powered variable filling with natural language description
- **API Integration**: Connect to any PromptVault instance
  - Configurable API URL
  - Secure API key authentication
