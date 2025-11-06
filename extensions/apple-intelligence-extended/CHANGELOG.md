# Apple Intelligence Extended - Changelog

## [BauDevs Extended Version] - 2025-11-06

### 🌍 Multilingual Compose Prompts

Added support for composing text in multiple languages with predefined prompts:

- **Portuguese (Portugal)**: "Write this in portuguese Portugal"
- **German (Austria)**: "Write this in German Austria"
- **Spanish**: "Write this in Spanish"
- **French**: "Write this in French"
- **Italian**: "Write this in Italian"

### 🔧 Configuration-Based Architecture

- Created `compose-prompts.ts` configuration file for easy extensibility
- New `executeComposeWithPrompt()` function in API for custom prompts
- Updated List Writing Tools to display all language variants with globe icons

### 📦 Improved Code Organization

- Refactored compose functionality to use centralized configuration
- Each language has its own command file for modularity
- Easy to add new languages by updating the configuration file

### 🎨 Enhanced User Experience

- All language variants visible in List Writing Tools view
- Consistent Globe icon for language-specific compose commands
- Organized under OpenAI section for clarity

---

## [Localization] - 2025-05-01

This update introduces localization for the extension.

Through the extension's preferences, you can now configure the extension to use a locale that is not English. In particular, correctly accessing Apple Intelligence requires the edit menu's name, the translation for _Writing Tools_, and the translation for _Show Writing Tools_.

## [macOS 15.2 Update] - 2024-12-17

A few goodies for macOS Sequoia 15.2!

### What's new?

- **🖼️ Create Image**: Directly create a original image in Image Playground, with the new Create Image command
- **🖊️ Compose**: You can now use the Compose Writing Tool, to collaborate with ChatGPT on your writing

## [Initial Version] - 2024-11-06

Introducing the Apple Intelligence extension for Raycast!

### Writing Tool Commands

Access Apple Intelligence Writing Tool commands, directly from the comfort of Raycast.

Apple won't give you hotkeys for Writing Tools, but that's not a problem... assign a hotkey to these commands, and use Apple Intelligence with hotkeys!

### List Writing Tools

Find all the writing tools in one place! In this list view, you can Pin and rearrange your favorite Writing Tools.

It also displays whether the Writing Tools are local, or run with Private Cloud Compute (server).
