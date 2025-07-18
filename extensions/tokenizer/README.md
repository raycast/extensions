# Tokenizer

Quickly count tokens in selected text or clipboard content using popular AI model encodings.

## Features

- **Count Tokens in Selection**: Tokenize any selected text
- **Count Tokens from Clipboard**: Tokenize clipboard content
- **Multiple Encodings**: Support for GPT-4o, GPT-3.5/4, and GPT-3 tokenizers
- **Instant Results**: Clean, non-intrusive notifications
- **Hotkey Support**: Works seamlessly with keyboard shortcuts

## Usage

1. **For Selected Text**: Select any text and run "Count Tokens in Selection"
2. **For Clipboard**: Copy text and run "Count Tokens from Clipboard"
3. **Configure Encoding**: Choose your preferred tokenizer in preferences

## Supported Encodings

- **o200k_base**: GPT-4o models
- **cl100k_base**: GPT-3.5 and GPT-4 models  
- **p50k_base**: GPT-3 models

## Technical Notes

This extension uses the `@dqbd/tiktoken` library for tokenization, which requires a WebAssembly (WASM) binary.

To comply with the Raycast Store's repository size limits and avoid issues with Git LFS on public forks, the `tiktoken_bg.wasm` binary is not included directly in this repository. Instead, it is downloaded at runtime from a [GitHub Release](https://github.com/ashleymavericks/tokenizer-raycast/releases/download/binary/tiktoken_bg.wasm) and cached locally on the user's machine.

**WASM Binary Details:**
- **Source Package**: `@dqbd/tiktoken@1.0.21`
- **Original Build Source**: [dqbd/tiktoken](https://github.com/dqbd/tiktoken) (an official fork of OpenAI's tiktoken)
- **License**: MIT
