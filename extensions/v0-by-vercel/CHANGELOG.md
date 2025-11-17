# v0 Changelog

## [1.1.0] - 2025-08-12

### Added

- Support for `v0-gpt-5` model and set as default in new chats and add-message flows.
- Auto-retry logic when opening a newly created chat: retries every 2s up to 3 times with a clear "Finalizing chat..." state.
- Migrated all API calls in commands/hooks to a shared `useV0Api` hook for consistent headers and error parsing.

### Fixed

- After creating a chat, navigate to the chat detail to avoid stale chat list.
- Always send `x-scope` for chat detail and metadata fetches to prevent loading hangs.
- Suppress transient 404s during chat propagation; only show failure after retries.

## [Initial Release] - 2025-08-12

### Added

- **Initial Release**: This major release introduces comprehensive integration with the v0 Platform API, enabling users to:
  - **Manage Projects**: Create, view, and assign projects to chats for better organization.
  - **Manage Chats**: Create new chats, view and initialize existing ones from various sources, delete, favorite, fork, send messages, and update chat privacy settings.
  - **View Billing**: Access detailed billing and usage information directly within Raycast.
  - **Manage Profiles**: Configure and switch between multiple v0 API key profiles, including setting default scopes for different teams or contexts.
