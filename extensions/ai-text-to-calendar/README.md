# AI Text to Calendar

<p align="center">
  <img src="assets/extension-icon.png" height="128">
  <h1 align="center">AI Text to Calendar</h1>
</p>

## Overview

AI Text to Calendar is a [Raycast](https://raycast.com/) extension that converts selected text into a Google Calendar registration URL using OpenAI's API and automatically opens it in your browser.

## Preferences

Configure the extension via `Raycast Settings > Extensions > AI Text to Calendar`.

| Property   | Label              | Type   | Required | Description                                                                                        |
| ---------- | ------------------ | ------ | -------- | -------------------------------------------------------------------------------------------------- |
| `apiKey`   | AI Service API Key | string | true     | Your personal AI service API key                                                                   |
| `model`    | Model Name         | string | false    | LLM model name, default is `gpt-4o-mini`                                                           |
| `language` | Language           | string | false    | Language of the output text, default is `English`                                                  |
| `endpoint` | Endpoint           | string | false    | LLM service endpoint (e.g., <https://api.deepseek.com/v1>), default is `https://api.openai.com/v1` |

## TODO

- [ ] User default settings (e.g., default date, time)
- [ ] With supplementary information (e.g., selected text + user input)
- [ ] Support for other calendar services (e.g., use Apple Script or Shortcut for Apple Calendar)

## License

This project is licensed under the MIT License.

## Example Test Cases

| Test Case                                            | gpt-4o-mini works? | gpt-4o works? |
| ---------------------------------------------------- | ------------------ | ------------- |
| `play tennis with Mike tommorrow at 5pm in the park` | ✓                  | ✓             |
| `Math class next Monday at 10am in lecture hall`     | x                  | ✓             |

Tips: try to use advanced LLM models for better results, especially for date reasoning.