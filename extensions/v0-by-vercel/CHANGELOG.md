# v0 Changelog

## [1.2.0] - {PR_MERGE_DATE}

### Added

- Project Environment Variables: view (masked with toggle), add, update, copy, and delete with auto-refresh.
- Chat responses now stream in as chunks are received
- Open existing chats from the list in a detail view
- Follow-ups: ask additional questions from chat detail with seamless streaming integration
- Initialize chats from v0 community templates

### Changed

- Show full message contents alongside each message preview in the chat messages list.
- Refactor chat UI for streaming with clearer loading states and formatting
- Improved streaming reliability: prevent interruptions during initial chat creation and follow-up messages

## [1.1.0] - 2025-08-12

### Added

- Support for `v0-gpt-5` model and set as default in new chats and add-message flows.
- Auto-retry logic when opening a newly created chat: retries every 2s up to 3 times with a clear "Finalizing chat..." state.
- Migrated all API calls in commands/hooks to a shared `useV0Api` hook for consistent headers and error parsing.
- Project Environment Variables management:
  - Add Environment Variable from `v0 Projects` list and from the project Env Vars view.
  - View Environment Variables as a list with masked values, toggle to view/hide value, and last-updated accessory.
  - Copy value and copy full `KEY=VALUE` actions.
  - Update Environment Variable (prefilled form; switches to PATCH under the hood).
  - Delete Environment Variable (uses the official delete endpoint) with auto-refresh on success.

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
