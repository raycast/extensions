# Prompt Enhancer

Raycast extension for rewriting prompts into short, direct instructions for LLMs.

## Commands

- `Enhance Prompt`: paste text, pick the provider, and copy the revised prompt.
- `Enhance Selected Text`: enhance highlighted text and replace it in place.
- `Manage AI Providers`: add, edit, delete, import, and choose the current provider.

## Setup

1. Run `Manage AI Providers`.
2. Add one or more providers with a name, API base URL, model, and API key.
3. Mark one provider as the current provider.
4. Use `Enhance Prompt` or `Enhance Selected Text`.

## Notes

- The current provider is shared across commands.
- `Enhance Prompt` also lets you switch the current provider before running a request.
- Existing single-provider preferences remain available as an optional legacy fallback until you save providers in the new manager.