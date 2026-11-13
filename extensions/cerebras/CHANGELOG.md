# Cerebras Changelog

## [Fix Crash on Launch] - 2026-11-13

- Fix commands failing with `Package subpath './_shims/auto/runtime' is not defined by "exports"` by upgrading the OpenAI SDK from v4 to v7
- Keep the proxy preference working: v7 no longer accepts `httpAgent`, so proxied requests now go through the client's `fetch`

## [Raycast Model Provider] - 2026-09-24

- Use available models directly in Raycast AI with streaming, conversation history, and supported model capabilities.

## [Initial Version] - 2025-04-15

Add initial Cerebras extension.
