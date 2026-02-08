#!/usr/bin/env bash
# Submit the code to the remote repository.
# Run from project root: ./scripts/push-to-remote.sh

set -e
cd "$(dirname "$0")/.."

echo "Staging all changes..."
git add -A

echo "Status:"
git status --short

echo "Committing..."
git commit -m "Raycast extension: Compile Prompt with multi-provider LLM support

- Translate any language to English and optimize as LLM-ready prompt
- Support DeepSeek, Kimi, OpenAI, Anthropic, Gemini
- Single API call, Markdown output, auto-copy to clipboard
- CHANGELOG.md, keywords, publish script, publication checklist
- README and media folder for store screenshots"

echo "Pushing to origin..."
git push origin HEAD

echo "Done."
