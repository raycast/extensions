# Easy Prompt for ChatGPT

Easily search prompts for ChatGPT

## Preferences

### Primary Action

  * Paste to Active App
  * Copy to Clipboard

### Language options for list of system built-in prompts

  * [en](https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv)
  * [简体中文](https://raw.githubusercontent.com/PlexPt/awesome-chatgpt-prompts-zh/main/prompts-zh.json)
  * [繁体中文](https://raw.githubusercontent.com/PlexPt/awesome-chatgpt-prompts-zh/main/prompts-zh-TW.json)

### Custom prompts

The feature allows for customization of the prompt list using CSV or JSON file types,
as well as support for multiple custom prompt lists separated by commas.
It will combine both system built-in and custom prompts when searching.

custom prompt list example:

* json
```json
[
  {
    "act": "prompt title",
    "prompt": "prompt content",
  }
]
```

* csv
```csv
act,prompt
prompt title,prompt content
```

## Usage

  1. Search or select a prompt, you can press `Command + D` to view the prompt details.
  2. Press `Enter` to Copy or Paste.
