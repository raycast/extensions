# Query ChatGPT Changelog

## [Fix] - 2024-05-15

- ChatGPT has changed their ChatGPT link to `https://chatgpt.com/` (previously it was `https://chat.openai.com`). Fixed extension to support breaking changes — old links are supported and they are replaced by extension to new ones.

## [New Additions] - 2024-04-13

- Reuse the same browser tab only for conversations, i.e., if the URL in the custom command starts
  with `https://chat.openai.com/c/`

## [Initial Version] - 2024-02-10

- Create custom command: provide GPT URL and custom prompt.
- Execute custom command with provided parameters.
