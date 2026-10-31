# AI CLI in Raycast

## [Initial Store Submission] - {PR_MERGE_DATE}

- Publish AI CLI in Raycast: native Raycast chats for six installed AI CLIs (Codex, Antigravity, Qoder, Qoder CN, WorkBuddy, Gemini) with a searchable suite launcher, an in-place CLI Settings view, per-CLI conversations, drafts and model choice, and automatic CLI detection.
- Localize root-search subtitles at runtime: each command refreshes its subtitle through `updateCommandMetadata` in the chosen language ("本机 AI CLI", "与本机 Codex CLI 对话", …), with English manifest text as the static fallback. Subtitles update after a command runs; manifest titles stay fixed because Raycast does not localize them.
- Merge CLI Settings into the AI CLI in Raycast launcher: the launcher opens the settings view in place, and chats open it through `launchCommand({ name: "cli-hub", context: { view: "cli-settings" } })`. Conversation data, preferences and the preserved `ask-codex-raycast` / `index` IDs are unaffected.
- Fix the npm shim and WorkBuddy product tests for macOS: compare realpaths on both sides, and simulate an outside product.json with a real symlink where the platform allows one, falling back to the fs mock where it does not.

## [v0.1.0-beta.1] - 2026-10-22

- Publish the GitHub beta under `bbfss/ai-cli-in-raycast`, with a focused repository homepage and extension-only source download.
- Use a multi-provider suite icon combining Codex, Antigravity, Qoder, WorkBuddy and Gemini CLI marks. Retain each CLI's individual icon.
- Preserve the extension and command IDs and the existing local conversation data.

## [macOS Preferred Languages] - 2026-10-21

- Resolve Follow System from Raycast's macOS application language, then the Mac's preferred language, with Intl fallback. Preserve manual overrides and Windows behavior.
- Cache macOS preference reads for the command process; quit and reopen Raycast after changing macOS language settings.
- Cover macOS app/global priority, cache behavior, manual overrides and Windows isolation in production-resolver tests. Native macOS acceptance remains pending.

## [System Interface Language] - 2026-10-21

- Default chats, the launcher and CLI Settings to Follow System, with simplified/traditional Chinese script detection and English fallback.
- Retain manual English, 简体中文 and 繁體中文 choices and existing selections.
- Pass 295 tests, build, TypeScript and lint. Select Follow System in native Windows preferences and verify the reopened launcher displays Chinese without sending inference or changing drafts.

## [Chinese Preference Descriptions] - 2026-10-21

- Replace English-only native preference descriptions and controls with Chinese-first bilingual text, including all six default strategies, detection, Codex permissions, and CLI paths. Add bilingual extension/command descriptions and prompt placeholders.
- Clarify the language setting: runtime extension screens follow the chosen language after reopening; the native host preference page keeps static bilingual text.
- Localize generated missing-path and conversation-format errors and empty history titles in simplified/traditional Chinese, preserving user text and raw CLI diagnostics.
- Pass 293 tests, build, TypeScript and lint. Read back all 17 native preference titles and check Chinese descriptions and translated dropdown options without changing saved values or sending inference.

## [Continue Input and Speaker Avatars] - 2026-10-21

- Keep message entry open and focused after choosing a model or effort, sharing the original draft and send guards through lazy native submenu branches.
- Preserve the active input branch during catalog refreshes while hiding stale choices; release lazy branches when reopening a picker or the root input.
- Add the current provider logo to message-entry and send actions. The Windows footer remains host-controlled and does not display the supplied icon.
- Add the small person avatar beside “You” in the transcript, aligned with the AI speaker headings. Preserve original stored/copied text.
- List CLI commands before Preferences inside CLI Settings, with direct chat launch as the first action and model defaults second. Keep the native extension preference page's host-controlled order.
- Retire callbacks when a picker is reopened or unmounted so an old branch cannot reset or overwrite a newer draft.
- Pass 290 tests, TypeScript, lint and build. Verify a native model → input → effort → input sequence with retained draft and keyboard focus; separately check the human avatar and CLI Settings order.

## [Live Model Controls and Defaults] - 2026-10-21

- Add separate model and effort menus to the input popover; refresh the current CLI catalog each time the input or either menu opens. Hide stale choices during failures/loading and validate choices again before each reply.
- Expose each CLI's last/fixed default strategy in Raycast preferences, with live fixed-model/effort selection in CLI Settings. Preserve fixed defaults during temporary in-chat changes and remember concrete last-used choices.
- Read explicit WorkBuddy model effort metadata from the selected installed bundle and pass the chosen effort to its CLI. Keep unverified per-model effort choices unavailable.
- Merge restored-draft previews into the send action to remove the second hint line; preserve recovery and draft/send protections.
- Keep the native full-width Markdown conversation, aligned provider logos and user-preferred exchange dividers. Keep Store applications withdrawn.
- Pass 261 tests, build, TypeScript and lint. Read back all six native strategy preferences and Codex model/effort menus; confirm the saved-draft preview appears only in its send action. Do not claim fresh all-provider inference or macOS acceptance.

## [Clear Exchange Boundaries] - 2026-10-21

- Keep the user-preferred simple exchange dividers, question quotes and aligned provider headings; omit round numbers and extra reply labels.
- Reserve horizontal rules for real exchange boundaries; keep assistant-authored rules in stored/copied text while hiding them in the displayed reply.

## [Full-width Markdown and Floating Input] - 2026-10-21

- Restore full-width native Detail conversations with Markdown code blocks, lists and formulas; remove the flattened List-row chat prototype.
- Open a bottom-right native ActionPanel.Submenu input with Enter and send with Enter, while keeping the conversation visible without editor-page navigation.
- Preserve drafts with revision, pending-send and mounted guards. Offer an explicit Send Saved Draft with preview, Copy Draft to Continue Editing and Clear Draft. Do not send hidden saved text under the ordinary empty-input action.
- Keep the latest question-and-answer group first, with each question above its answer. Keep Stop Response separate from sending; only supported CLIs accept instructions during a reply. Do not automatically queue drafts.
- Vertically align the inline provider logo with its name using an 18px Markdown image inside `<sub>`; native Windows center measurements improved from a 9px difference to 0.5px.
- Document the native uncontrolled search-input boundary: no programmatic draft refill or promised persistent multiline/Shift+Enter editing. Maintain asset provenance separately in BRANDING.md.
- Pass build, TypeScript, lint and 172 tests. Verify native Windows Markdown body/code blocks, provider logos, the floating input and the user's successful message/reply. This round did not retest every provider backend or independently validate macOS. Keep withdrawn Store applications closed.

## [CLI Launcher, Settings and Localization] - 2026-10-21

Earlier development state; current input behavior and asset documentation are described above.

- Rename the suite AI CLI in Raycast and add a native launcher and CLI Settings, for eight independently enabled commands including the six CLI chats.
- Add English, simplified Chinese and traditional Chinese interface preferences; retain English static Raycast metadata and preserve original conversation content and CLI diagnostics.
- Add default-on automatic installation detection, explicit-path priority and manual-path mode. Report discovery separately from authentication.
- Use native List/Metadata settings and Form setup. Automatically check the local connection/catalog without inference, then require a valid model choice; guard startup against duplicate development mounts and unmount races.
- Remove onboarding and empty-chat clutter while preserving full-width conversations and the floating composer.
- Apply a Gemini-authored SVG logo, mechanically rendered to `suite-icon.png`, across all eight commands.
- Verify the earlier build, TypeScript, lint and test suite; verify the Chinese launcher and WorkBuddy navigation to model selection without claiming authenticated inference.
- Keep the withdrawn Store applications closed; no new submission.

## [Multi-CLI Suite Development] - 2026-10-21

- Add six independent commands under AI in Raycast, each with native Raycast enable/disable controls and isolated history, drafts and model settings.
- Add Qoder, Qoder CN, WorkBuddy and Gemini adapters with exact native session mappings.
- Fix Windows worker environment and npm entrypoint discovery without shell interpolation.
- Wait for process cleanup and durable session saves; prevent overlapping sends, switches and stale stop labels.
- Refine native setup and empty states with Gemini Flash design input; preserve the full-width chat and floating composer.
- Keep Store publication withdrawn.

## [Development Refactor] - 2026-10-21

- Rename the extension AI in Raycast and introduce a shared local CLI provider contract.
- Add Antigravity CLI conversations alongside Codex, with explicit session resume, streamed output and cancellation.
- Isolate setup, models, drafts and recent conversations by provider while preserving installed Codex data.
- Add a native Provider menu to the main Actions panel and floating composer.
- Expose supported capabilities honestly: Antigravity has model variants and no in-progress steering in this interface.
- Preserve full-width Markdown/math, Enter-based input, recent chats, and safeguards for drafts and late acknowledgements.
- Withdraw the previous Store application; continue this version as a development build.
