# Translator (Raycast Extension)

For the Chinese version, see [README_zh.md](./README_zh.md).

A Raycast translation extension for Windows that supports Chinese, Japanese, and English translation.  
You can translate by typing text manually or start quickly from clipboard content.

## Key Features

- Chinese, Japanese, and English translation
- Automatic source language detection (with manual override)
- `Clipboard Translator`: prefill clipboard text, then choose the target language
- Multi-profile API configuration management
- Automatic fallback to another profile when one provider is unavailable

## Available Commands

- `Translator`: standard translation entry
- `Clipboard Translator`: start with prefilled clipboard text
- `Translator Profiles`: manage API profiles (create, edit, duplicate, enable/disable, set default)

## Quick Start

1. Open `Translator Profiles`
2. Create at least one profile (`Base URL`, `API Key`, `Model`)
3. Return to `Translator` or `Clipboard Translator` and start translating

## Typical Usage

- Daily translation: open `Translator`, enter text, choose a target language, and submit
- Clipboard workflow: open `Clipboard Translator`, review or edit prefilled text, choose target language, then submit
- Profile fallback: if the primary profile fails, the extension automatically tries available backup profiles

## Common Scenarios

- Quickly understanding English or Japanese documents
- Short text translation between Chinese, Japanese, and English
- Cross-language communication in chats, emails, and comments

## Notes

- This extension is intended as a translation assistant; always validate output in context
- API cost and availability depend on the provider configured in your profiles
