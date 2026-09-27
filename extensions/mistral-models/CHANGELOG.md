# Changelog

## [Initial Store Release] - {PR_MERGE_DATE}

- Discover the latest Mistral API chat models in Raycast's native AI model picker.
- Configure credentials through a password preference; support streaming, images, and tools according to model capabilities.
- Deduplicate model labels and exclude Codestral and Voxtral.
- Recover interrupted text responses with bounded retries and continuations, without replaying streamed tool calls.

<!-- The entries below record pre-release development. -->

## [API Only] - 2026-09-27

- Remove the Vibe mode selector and fixed catalog; always discover models using the configured Mistral API key.
- Preserve latest-only filtering, clean model names, Codestral/Voxtral exclusions, and streaming recovery.

## [Bounded Recovery] - 2026-09-27

- Retry transient request failures up to twice before streaming starts, respecting SDK backoff and retry headers.
- Continue text responses missing a finish reason up to twice, with partial text/reasoning history and combined reported usage.
- Never continue after streamed tool information, explicit provider stops, or cancellation; enforce a shared operation deadline.

## [Streaming Reliability] - 2026-09-27

- Normalize Mistral usage-only SSE events to avoid the SDK's empty-choices crash, preserving token usage.
- Report interrupted streams, token-limit truncation, and empty/reasoning-only stops as errors instead of completed answers.
- Keep Raycast in charge of tool execution; no automatic completion retries or extra API calls.

## [Provider Review] - 2026-09-27

- Simplify API display names, group same-name entries with stable family-ID preference, and exclude Codestral's `mistral-code-*` aliases.
- Exclude Codestral and Voxtral families from API mode.
- Limit API mode to chat models with a `-latest` ID; keep Vibe's three curated models unchanged.
- Distinguish API models with identical display names by appending their model IDs, preserving aliases and versions.
- Respect the selected model's temperature capability when sending requests.
- Explain model discovery connection failures and timeouts without exposing transport details.
- Verify fragmented Unicode streaming and token usage through the real Mistral SDK with a mocked HTTP transport.

## [Initial Version] - 2026-09-27

- Provide Mistral Medium 3.5, Z.ai GLM 5.3, and Z.ai GLM 5.2 in Raycast's native model picker.
- Support streaming, tool calls, and Medium 3.5 image inputs.
