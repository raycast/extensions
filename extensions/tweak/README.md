# Tweak — Small Tweak, Big Difference

Fix grammar, enhance prompts, and format digestible text — without changing what you mean. The only message polisher that preserves your meaning. Works with Groq (free), OpenAI, or Anthropic.

## The Problem

You type fast in Slack. Sometimes too direct. You don't mean to be harsh — you're just rushing. But going to ChatGPT 100 times a day to polish messages is painful. 

## The Solution

Copy text (⌘+C) → Hit your hotkey → Polished text gets pasted back. 2 seconds. Done. 

## Core Commands

| Command            | What it does                                                                 |
| ------------------ | ---------------------------------------------------------------------------- |
| **Enhance Prompt** | Turn a rough idea into a detailed, tool-specific AI prompt.                  |
| **Fix Grammar**    | Fix spelling, grammar, punctuation only. Zero changes to your words or tone. |

## Custom Multi-Actions

Tweak 1.0 comes with **5 Custom Action slots**. You can configure your own AI prompts in the extension preferences to build your own tools:
- Create a "Slack Announcement Formatter"
- Build a "Hindi Translator"
- Create a "Meeting Note Summarizer"
- Assign each to its own unique hotkey for instant global access.

## What Makes Tweak Different

**It never changes what you mean.** Every command is optimized to preserve your original stance, intent, and nuance. It just improves the structure and clarity.

## Setup

1. Install the extension
2. Set your AI provider in preferences:
   - **Groq** (free) — Get a key at [console.groq.com/keys](https://console.groq.com/keys)
   - **OpenAI** — Get a key at [platform.openai.com](https://platform.openai.com)
   - **Anthropic** — Get a key at [console.anthropic.com](https://console.anthropic.com)
3. Assign hotkeys to your most-used commands
4. Copy text (⌘+C) → Hit hotkey → Done

## How It Works

1. Copy text to your clipboard (⌘+C)
2. Trigger a Tweak command (via hotkey or Raycast search)
3. Tweak reads your clipboard, sends it to your chosen AI provider
4. The polished text is pasted back into your active app automatically

Your API key is stored securely in Raycast preferences and never leaves your machine except to call your chosen provider.
