# AI Provider Switch Changelog

## [Hardened Provider Config Workflows] - 2026-05-19

- Enhanced provider configuration workflow for better reliability
- Improved error handling and validation
- Streamlined user experience for provider management

## [Improved Provider and Model Duplication Flow] - 2026-05-06

- Duplicate providers with unique IDs automatically assigned
- Duplicate models with pre-filled configurations
- Better workflow for creating model variants from existing templates

## [Added Provider/Model Disable States and Icon Presets] - 2026-04-29

- Disable providers and models without permanent deletion
- Support for disabled state persistence in separate storage
- Provider icon presets for quick configuration
- Icon customization options

## [UI Components and Bug Fixes] - 2026-04-27

- React-based UI components for provider and model management
- Fixed multiple edge cases in form handling
- Improved error messages and user feedback

## [Core Implementation] - 2026-04-25

- Type definitions and constants
- YAML processing utilities
- API utilities for remote model querying
- Mask utilities for sensitive data protection
- Foundation extension structure

## [Initial Release] - 2026-04-25

- Manage Raycast AI providers and models from a visual interface
- Browse, add, edit, duplicate, disable, and delete providers and models
- Import remote models from OpenAI-compatible `/models` endpoints
- Query and sync remote models with local configuration
- Support multiple named API keys per provider
- Mask API keys in lists and detail views
- Choose provider icons from bundled presets or upload custom icons
- Write `providers.yaml` via atomic replacement with backup
- Support Raycast provider fields (return_images, web_search_options)
- Use custom `providers.yaml` path from preferences
