# Claude Changelog

## [API compatibility fixes] - 2026-08-19

- Fix: Asking a question on Claude Opus 4.7 or newer (including Opus 4.7, Sonnet 5, and Opus 5) failed with a 400 error. Sampling parameters were removed on those models, and the extension was still sending `temperature` on every request.
- Fix: With "Stream Responses" turned off, requests could fail outright instead of answering — and on Opus 4 and 4.1 the failure left the loading indicator spinning with no error shown. Non-streaming requests are now capped at the limit the API accepts, and if a particular model rejects even that, the request is retried at a smaller size rather than failing — so a long answer comes back shorter rather than not at all, and nothing is left hanging.
- Fix: Presets on newer models were capped at 4,096 output tokens. The maximum is now read from the API for each model instead of guessed from its name.
- Fix: Only the first 20 models were listed. The full model list is now loaded.
- Fix: Long conversations stopped working permanently once they outgrew the model's context window. Older turns are now left out of the request when needed — the conversation stays readable in full, and a note says when this happened and why.
- Fix: Asking a new question while an answer was still streaming could let the abandoned request overwrite the new one's result and leave the newer answer unstoppable.
- Fix: Asking a second question before the first answered could let the earlier request report success and stop the loading indicator while the newer answer was still being written.
- Improvement: Updated the Anthropic SDK, which the token-counting used by the fix above requires.

## [Fix memory leak] - 2026-02-01

- Fix: Resolved JS heap out of memory error by throttling UI updates during streaming responses
- Fix: Removed duplicate history entries that were being created when streaming was enabled
- Fix: Added proper stream cleanup on component unmount to prevent orphaned handlers

## [Update] - 2025-11-03

- Feature: Added dynamic model retrieval removing the need to update the extension with each model release.

## [Update] - 2025-05-23

- Feature: Added new [Claude Sonnet 4](https://www.anthropic.com/news/claude-4)

## [Added missing contributor] - 2025-03-03

## [Update] - 2025-02-26

- Fix: Don't append default model when local models exist

## [Update] - 2025-02-25

- Feature: Added new [Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet)

## [Update] - 2025-01-30

- Fix: History now saves as expected
- Fix: "Got your answer!" now only displays after the full answer has been streamed

## [Update] - 2024-12-20

- Fix: Models dropdown not displaying all models correctly

## [Update] - 2024-12-12

- Fix: Remove duplicated "Copy Question" action, use existing with tweaked conditions
- Fix: Use Claude 3.5 Haiku as default fallback model

## [Update] - 2024-12-09

- Feature: Added copy question actions

## [Update] - 2024-11-05

- Feature: Added new [Claude 3.5 Haiku](https://www.anthropic.com/news/3-5-models-and-computer-use)

## [Update] - 2024-10-24

- Feature: Added new [Claude 3.5 Sonnet](https://www.anthropic.com/news/3-5-models-and-computer-use)

## [Update] - 2024-08-22

- Feature: 8192 token limit for Claude 3.5 Sonnet [out ot Beta](https://x.com/alexalbert__/status/1825920737326281184)

## [Update] - 2024-08-08

- Feature: Enabled Beta [8192 tokens output limit](https://x.com/alexalbert__/status/1812921642143900036) for Claude 3.5 Sonnet

## [Update] - 2024-07-10

- Fix: Restarting a conversation will retain the currently selected model

## [Update] - 2024-06-20

- Feature: Added new [Claude 3.5 Sonnet](https://www.anthropic.com/news/claude-3-5-sonnet)

## [Update] - 2024-06-19

- Fix: Set default values for max tokens when undefined to avoid migration issues
- Fix: Changed default value of stream responses from `false` to `true`

## [Update] - 2024-06-15

- Feature: Added option to stream responses
- Feature: Added ability to set max response tokens
- Feature: Integrated prompts from Anthropic's [prompt library](https://docs.anthropic.com/claude/prompt-library)
- Fix: Removed `Ask` `onSelectionChange` race condition

## [Initial Release] - 2024-03-18

## [Initial Version] - 2024-03-17
