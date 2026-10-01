# Refine Changelog

## [Settings and Workflow] - {PR_MERGE_DATE}

- Use the product name Refine.
- Configure models, effort, mode, and system prompt in a separate Refine Settings page.
- Save model, effort, and mode per provider, and refine selected text immediately using those settings.
- Run directly from an assigned shortcut without opening the launcher or a preview.
- Replace selected text immediately, with native HUD status badges; stop if the source selection changes.

## [Automatic Model Configuration] - {PR_MERGE_DATE}

- Discover available models from the configured API in a searchable dropdown.
- Read effort and Fast options from provider metadata, including CLIProxyAPI's Codex catalog.
- Default to Normal mode, remember the selected model per API URL, and allow refreshing models.
- Edit and save the system prompt used with every model, with an action to restore the original instructions.

## [Initial Version] - {PR_MERGE_DATE}

- Refine selected text with a configurable OpenAI-compatible provider.
- Preview the refined and original text before copying or pasting.
