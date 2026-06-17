# Commit Message Formatter

[Commit Message Formatter](https://github.com/zrr1999/commit-message-formatter) is an commit messages generator.

## Features

- [x] Generate commit message by LLM following selected text
- [x] Concurrency of commit message generation
- [ ] History of generated commit messages
- [ ] Support custom git types
- [ ] Integrate with git diff

## Preferences

You can customize the following preferences:

- `Emoji Format`: Choose between `emoji` and `emoji code`.
- `Copy Format`: Choose between `emoji-type` and `emoji`.
- `Terminator`: Change the terminator of the commit type and message.
- `Action`: Choose between `Copy to Clipboard`, `Paste into Editor` and `Copy and Paste`.
- `OpenAI API Key`: API Key is used to authenticate with OpenAI API.
- `OpenAI Base Path (Optional)`: Base Path is used to override base path with OpenAI API.
- `Model`: Model is used to specify the model to use.
- `Language`: LLM will use this language to generate content.

## Customize

You can fork this repo and change the `src/lib/types.ts` to add more gitmojis.
