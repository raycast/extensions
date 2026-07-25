# Codex for OSS application notes

Use this document as a working draft before submitting the Codex for Open Source
application.

## Project summary

WordingKit is a Raycast extension for rewriting selected text in any macOS app.
It supports local Ollama models by default and optional OpenAI, Anthropic, and
Groq providers for users who need cloud models.

## Why this project fits

- It is a maintainer-owned public productivity tool with a clear user workflow.
- It helps developers and technical users rewrite issues, pull request comments,
  release notes, support replies, and team messages without leaving their
  current app.
- It has privacy-conscious defaults: local Ollama modes, no backend service,
  provider keys stored in Raycast Preferences, and provider error redaction.
- It includes tests, CI, issue templates, contribution guidance, and a security
  policy so outside users can report and contribute safely.

## Current maintainer workflow

- Use Codex for small implementation tasks, code review, documentation updates,
  and release preparation.
- Run `npm test`, `npm run lint`, and `npm run build` before publishing changes.
- Use manual Raycast QA for selection, rewrite, paste, cancellation, and
  provider-error behavior.
- Use manual rewrite evaluation to compare prompt and model behavior across
  representative sample messages.

## Evidence to add before applying

- Public repository URL.
- Latest release or first public tag when ready.
- GitHub Actions status.
- Screenshots from `metadata/`.
- Examples of issues, pull requests, or discussions once users begin reporting
  feedback.
- Short explanation of how Codex credits or ChatGPT Pro would improve
  maintainer workflows.

## Suggested application answer

WordingKit is an open-source Raycast extension for improving selected writing
from any macOS app. It is designed for developer and maintainer workflows such
as issue triage, pull request review, release notes, support replies, and team
communication. The project keeps privacy visible by defaulting to local Ollama,
storing cloud provider keys only in Raycast Preferences, and redacting provider
errors before display.

Codex would help maintain the project by speeding up provider integration
review, test coverage, documentation updates, prompt iteration, release
preparation, and GitHub issue triage. API credits would also make it easier to
validate optional cloud-provider behavior without shifting the default local
workflow away from Ollama.
