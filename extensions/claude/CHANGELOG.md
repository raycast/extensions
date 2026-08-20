# Claude Changelog

## [Recents, presets, and a new storage layer] - {PR_MERGE_DATE}

- Removed: The **History** and **Saved Answers** commands are gone. Everything they showed
  now lives in the new Recents command, and your saved answers become pinned conversations
  there automatically. If you had a hotkey or Quicklink pointing at either command, it will
  stop working and needs to be re-pointed at Recents
- Feature: **Recents** replaces Conversations, History, and Saved Answers with one list.
  Your past conversations, saved answers, and history are folded together the first time you
  open it — nothing to do on your end. Adds an Active/Archived/All filter, and Pin, Archive,
  Rename, and Delete on every conversation
- Improved: The **Models** command is now **Presets** — it manages a saved model + system
  prompt + temperature + token limit, not a model, and the label was the odd one out among
  the extension's own copy, which called that same thing a preset everywhere else. The
  command itself is unchanged, so an existing hotkey keeps working
- Improved: "Save Answer" is now **Pin Conversation**. "Save" had come to mean two different
  things — Export History writes an actual file, while this only flags a conversation to keep
  it at the top of Recents. The whole extension now uses one pin icon for it instead of a
  star here and a pushpin there
- Fix: Deleting a conversation in Recents now removes it everywhere — including your history
  and saved answers — instead of leaving the text behind in a place you couldn't see it
- Fix: Archiving, renaming, and unpinning a conversation now stick. If you had existing
  conversations, every one of those changes was silently undone the next time you opened
  Recents, and a conversation carried over from Saved Answers could not be unpinned at all
- Fix: Conversations, saved answers, and history can no longer be erased by a write that
  lands before the initial read
- Feature: Recents can export your entire conversation history to a JSON file (⌘⇧E),
  regardless of the current filter, so you have a copy before deleting anything or moving to
  another machine. There is no import yet — this is export only
- Feature: If Recents comes up empty when it shouldn't, that same shortcut offers **Export
  Stored Data to JSON**, which writes everything the extension has in storage — including
  anything an upgrade couldn't fully read and set aside — so your conversations are
  recoverable by hand rather than only reachable through a list that isn't showing them
- Fix: The model you pick in Ask is now the model your question is actually sent to. Picking
  a preset, quitting Raycast, and reopening Ask previously showed the preset you chose while
  sending the request on the default model
- Fix: Asking a follow-up now selects the new answer. The list is newest-first, so a follow-up
  appeared at the top while the highlight and the detail pane stayed on the previous question
  — it looked like nothing had happened
- Improved: "Continue Ask" in Recents is now **Ask a Follow-up**, and on an answer you are
  reading, Enter opens the question input rather than copying the answer. Copy Answer moved
  to ⌘C
- Fix: The search bar is cleared after you ask, so the answer view reads as a place to ask the
  next question instead of the results of the last one. Starting a new conversation clears it
  too, instead of leaving the previous question sitting there
- Fix: An answer that came back empty or as nothing but whitespace is no longer saved, or sent
  back to Claude as context on your next question
- Fix: A failed or cancelled request no longer leaves a blank answer in the transcript
- Fix: Conversation transcripts are no longer stored in reverse. Sorting for display mutated
  the underlying chat list, so a conversation was labeled with its first question instead of
  its latest — and from the third question on, prior turns were sent to Claude in reverse
  order. Existing reversed conversations are repaired on load
- Fix: "Start New Conversation" mid-session now actually saves that conversation; previously
  it was created but never recorded
- Fix: A conversation with no messages no longer crashes the list
- Fix: Returning from a conversation now refreshes the list, instead of showing a stale empty
  list until the command is reopened
- Fix: Dismissing a view mid-answer no longer leaves a toast animating forever
- Fix: Lists no longer spin forever on first run — the loading state resolves when there is
  nothing stored yet, so the empty state actually appears — and the Presets list no longer
  flashes an empty state before your presets load
- Fix: Searching with no matches now shows an explanatory empty state instead of a blank list
- Fix: With "Use Full Text Input" enabled, starting a new conversation no longer opens the
  question form twice and leaves a duplicate screen behind the first back press
- Fix: Switching models while an answer is still streaming no longer discards the switch
- Fix: Saving a new preset no longer leaves a spinner running forever after it succeeded
- Feature: Presets can be exported to and imported from a YAML file (⌘⇧E and ⌘⇧I in the
  Presets command), so you can back them up, edit them in a text editor, or move them to
  another machine. Importing asks what to do when a preset name already exists — skip it,
  replace it, or keep both — instead of silently overwriting your work
- Feature: The preset importer also accepts a Raycast Agent JSON file, mapping each agent's
  instructions and model onto a preset. This one is provisional: it is built from sample
  export files rather than a verified live export, so an agent file whose shape differs may
  import incompletely
- Feature: The model picker now offers every model from the live API alongside your saved
  presets, so you can pick a bare model without creating one
- Feature: Ships starter presets (Deep Reasoning, Balanced, Quick Answer, Code) built from the
  newest Opus, Sonnet, and Haiku available to your account
- Feature: The built-in preset tracks the newest Sonnet and is named for the model it actually
  calls, instead of a generic "Default Model" pinned to an older release. It now also picks up
  that model's real output ceiling, rather than staying on the old 4,096-token limit
- Improved: Seeded preset prompts follow Anthropic's published Claude Opus 5 prompting
  guidance — step-by-step and self-verification instructions removed (the model does this
  unprompted, and asking for it wastes tokens), with explicit conciseness and scope wording in
  their place
- Feature: Empty states use the Claude icon and offer actions — including "Start New
  Conversation" when you have none
- Feature: Added a "Get an API Key" action and a link to the console in the API key preference
  description
- Feature: Failure toasts carry a "Copy Error" action, and route to preferences or billing when
  the error is an auth or quota problem
- Improved: Model names drop the redundant "Claude" prefix in pickers and lists
- Improved: Conversations show a message count and drop the redundant date column; the presets
  list drops its date column too, and the dates remain in the detail panel
- Fix: The model list is re-fetched after this update rather than reused from an older cache,
  so per-model output and context limits take effect immediately instead of on the next refresh
- Chore: Updated `@raycast/utils` (1 → 2), ESLint 9 with flat config, TypeScript 5.9, Prettier
  3, and React 19 types; removed the unused `raycast` and `cross-fetch` dependencies

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
