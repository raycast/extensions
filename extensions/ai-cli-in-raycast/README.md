# AI CLI in Raycast

One **AI CLI in Raycast** extension, with seven native Raycast commands:

- **AI CLI in Raycast** — a searchable launcher for all six CLIs
- **Codex in Raycast**
- **Antigravity in Raycast**
- **Qoder in Raycast**
- **Qoder CN in Raycast**
- **WorkBuddy in Raycast**
- **Gemini in Raycast**

Each CLI command opens that CLI directly and restores its own conversations, drafts, model choice, and setup record. The launcher and settings screen do not share conversation content between CLIs. Asset sources and command branding are documented in [BRANDING.md](BRANDING.md).

## Use and enable individual CLIs

1. Open **Raycast Settings → Extensions → AI CLI in Raycast**. Use Raycast's native **Enabled** checkbox on each command to show or hide it. Disabled CLI commands cannot be launched from the suite launcher or in-chat Switch CLI menu either.
2. Install and sign in to the CLI through its own terminal interface. Open **AI CLI in Raycast** to choose a CLI, or launch a command such as **Codex in Raycast** directly. With automatic detection enabled, first-time setup checks the local connection and model catalog automatically, then asks you to choose a model. These checks send no inference prompt. Manual detection mode keeps an explicit connection-check action.
3. Read the conversation in the full-width Markdown view. Press **Enter** to open the native input popover above the bottom-right action bar, type a message, then press **Enter** to send. The conversation stays visible; no editor page opens.
4. The input popover has separate **Model** and **Effort Level** menus. After choosing either, message entry stays open and focused, with the draft retained. Opening the input or either picker checks the current CLI catalog again. **Cmd/Ctrl+P** switches CLI commands, **Cmd/Ctrl+M** opens models, and **Cmd/Ctrl+E** opens effort levels. Stop a running reply before switching CLI.
5. In **Raycast Settings → Extensions → AI CLI in Raycast**, choose each CLI's default strategy: **Use Last Selection** or **Fixed Model and Effort**. Open the launcher, choose **Open CLI Settings → [CLI] → Model and Effort Defaults** to pick the fixed pair from its current catalog. Fixed mode requires a valid choice and applies on opening the CLI or starting a new chat; in-chat choices remain temporary. Saving a fixed pair checks the catalog again without sending a prompt. Switching to last mode preserves the fixed pair for later reuse.

Command enablement controls Raycast entry points; it does not uninstall a CLI or erase its saved chats. Existing Codex extension and command IDs are retained. Changing providers saves the current draft and launches the other command without passing your prompt or conversation to it.

## Settings and detection

Open the launcher and choose **Open CLI Settings** to see the six CLI entries first, followed by Preferences. Each entry opens its chat; **Model and Effort Defaults** is its second action. Settings uses a native List and metadata inspector; setup uses native Forms. Raycast controls the Commands/Preferences order on its own extension preference page; the public manifest has no layout setting for that page. Chat uses a full-width native Detail with Markdown, code blocks, lists and formulas. Message entry uses an ActionPanel.Submenu input popover without navigating away from the conversation.

| Preference                      | Behavior                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Interface Language              | Follow System by default; manually choose English, 简体中文, or 繁體中文            |
| Automatic CLI Detection         | Enabled by default; searches supported standard installation paths                  |
| Per-CLI Model Strategy          | Reuse the last model/effort, or apply a fixed pair chosen from the live CLI catalog |
| Per-CLI Path                    | An explicit path always takes priority; leave empty for automatic discovery         |
| Working Directory               | Optional directory used by the CLI                                                  |
| Codex Web Search / Sandbox Mode | Codex-specific controls                                                             |

When automatic detection is disabled, enter an explicit path for each CLI you use. A failed custom path is reported rather than silently replaced by an automatically found installation. Detection discovers local files; **Found** does not mean signed in, entitled to a model, or able to send a prompt. Use **Detect CLIs Again** after installing a CLI or changing paths.

Chats, the launcher, and CLI Settings default to **Follow System**. On macOS, this uses the language assigned to Raycast under **System Settings → General → Language & Region → Applications**, or the Mac's first preferred language when no app override exists. Quit and reopen Raycast after changing these macOS settings. Windows uses the operating system locale. Chinese locales use simplified or traditional Chinese according to their script; other languages use English. A manual English, 简体中文, or 繁體中文 selection overrides the system on both platforms; reopen the command after changing it. Existing manual choices are retained.

Raycast's native extension preference page uses static manifest text. Its titles, descriptions, checkbox labels, and dropdown choices show Chinese first with English alongside. Extension and command descriptions are bilingual too. Raycast's own controls, such as Settings, Search, and Show more, keep the host's language. Language selection does not translate model IDs, CLI diagnostics, saved prompts, or AI responses, and it does not change the language an AI must answer in.

## Providers and limitations

| Additional CLI   | Model choices                                                                          | Resume             | Local Windows evidence (2026-10-21)                                                              |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| Qoder / Qoder CN | Live `--list-models`, plus CLI Default                                                 | Exact session ID   | Qoder CN 1.1.74: inference, restart/resume, cancel/continue passed; international build untested |
| WorkBuddy        | Installed `--help` aliases and selected bundle's chat model metadata, plus CLI Default | Exact session ID   | Embedded WorkBuddy AI CLI starts but requires its own login; inference/resume unverified         |
| Gemini CLI       | CLI Default; no invented catalog                                                       | Exact session UUID | 0.65.0 starts; the local account returned `UNSUPPORTED_CLIENT`, so inference/resume unverified   |

Only Codex supports steering here. WorkBuddy exposes effort levels only when its selected installed bundle explicitly lists them for that exact model and its CLI advertises the effort flag. The local 2.161.0 bundle lists 23 choices, 12 with explicit effort levels; these are catalog results, not account entitlement checks. AGY 1.4.4 and Qoder CN 1.1.74 expose effort flags but do not publish per-model levels in their model-list output, so this extension keeps their effort menu informational. AGY's advertised low/medium/high variants remain separate model IDs. Gemini uses CLI Default without an invented model or effort catalog.

Qoder and WorkBuddy receive no-tools, strict-empty-MCP, hooks-disabled and noninteractive permission flags. Qoder CN's actual trace confirmed empty tools/MCP. WorkBuddy's init still advertised tools; effective restriction remains unverified pending CLI login. Gemini uses default approval mode and existing configuration, with extensions disabled; it is not represented as a no-tools or Codex-equivalent sandbox. Complete any workspace trust requirement in the CLI itself.

| Feature                         | Codex CLI                                                  | Antigravity CLI (`agy`)                                    |
| ------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Bridge                          | Local app-server over stdio                                | Local stream-json subprocess                               |
| Resume                          | Explicit thread ID                                         | Explicit conversation ID, persisted per local thread       |
| Model discovery                 | app-server model/list                                      | agy models                                                 |
| Streaming and stop              | Yes                                                        | Yes                                                        |
| Add instructions during a reply | Supported                                                  | Wait or stop before sending another message                |
| Effort selection                | Supported levels from CLI                                  | Model variants; no verified separate per-model effort list |
| Permissions                     | Selected Codex sandbox, no automatic interactive approvals | agy sandbox + plan mode; its guarantees differ from Codex  |

The extension uses existing local CLI authentication. It does not import browser cookies, copy credentials, change global CLI configuration, or expose a network listener. A connection/catalog check does not prove inference entitlement, provider credential validity, quota, or network availability for the next message.

npm CLIs are resolved to known Node entrypoints and require Node.js on PATH. Windows `.cmd`/extensionless npm shims never interpolate prompts. For custom WorkBuddy installations, set WorkBuddy CLI Path to `resources/app.asar.unpacked/cli/bin/codebuddy`; the embedded launch selects its WorkBuddy bundle. A separate CodeBuddy CLI is not automatically treated as WorkBuddy. A `.js` entrypoint can also be selected for Gemini or Qoder. The extension does not install CLIs itself. Antigravity requires a native executable on Windows; shell wrappers are not executed.

Exchanges use simple horizontal separators, quoted questions and provider headers, without round numbers or extra card headings. Assistant-authored standalone rules are hidden for display so they cannot be mistaken for a new exchange. Raw/copied text stays unchanged.

The latest question-and-answer group appears first, with the question above its answer and earlier exchanges below. The conversation renders Markdown directly rather than flattening replies into List rows; stored and copied text stays unchanged. **Stop Response** is an explicit action during a reply; Enter never stops it. Codex accepts additional instructions while responding. Other CLIs let you write a draft and send it manually after the reply finishes or is stopped; drafts are not automatically queued.

A successful send acknowledgement clears the submitted input only if it has not since been edited. Draft revisions, pending-send checks and unmount guards protect newer text from old callbacks and duplicate submissions. Failed sends keep the draft. **Clear Draft** explicitly discards it.

The popover uses Raycast's native submenu search input. It is not a persistent multiline editor and does not promise Shift+Enter line breaks. The public API cannot programmatically refill its search text. When reopening a saved draft, its preview appears in the explicit **Send Saved Draft: …** action, without a second hint row; **Copy Draft to Continue Editing** lets you copy and paste it into the input. Empty input does not silently send hidden saved text under the ordinary Send Message action. Existing multiline drafts can be sent intact through Send Saved Draft; there is no separate editor page.

Ordinary input has no duplicate instruction section. The native `Search…` placeholder and submenu heading behavior are controlled by Raycast. Its public submenu API has no highlighted-row callback, so the heading changes when entering a submenu, rather than following row highlights. A loading or failed catalog never leaves older model/effort choices selectable. Explicit choices are checked again before each new reply; steering keeps the running reply's model.

Model/effort choices use lazy native submenus to continue input without dismissing the popover. Escape follows Raycast's submenu hierarchy; selecting several options can add intermediate levels until the popover is closed. All input branches share one draft and send guard. Retired branch callbacks cannot edit a newer draft. Human messages have a small person avatar beside “You”, using the same 18px alignment as the AI headings. The provider logo also appears in the send action and expanded input action; the Windows footer button itself does not display the supplied icon.

## Architecture

`provider.ts` defines the common chat contract and capabilities. Codex retains its app-server implementation. `provider-antigravity.ts` adapts Antigravity events. `provider-cli.ts` manages bounded subprocess lifetime and durable mappings for the other CLIs; `cli-protocols.ts` handles vendor events and `cli-executable.ts` resolves native/Node entrypoints. `cli-detection.ts` supplies installation discovery to the launcher and settings screen. `command-routing.ts` maps independent commands to providers; switching uses Raycast launchCommand and respects disabled commands. `session-storage.ts` scopes persisted state by provider; Codex keeps its legacy keys. `i18n.ts` translates interface copy with an English fallback. No CLI implicitly resumes its globally most recent conversation.

The provider/agent separation described by [Magpie](https://github.com/yetone/magpie) is a design reference. The current Antigravity adapter was implemented against the installed CLI protocol and real stream-json traces; the pinned source comparison and real protocol evidence are in [MAGPIE_RESEARCH.md](MAGPIE_RESEARCH.md).

## Verification and development status

Build, standalone TypeScript, lint and **301 tests passed** for the current implementation. Native Raycast 2.8.2 has Follow System selected; reopening the launcher on this Windows zh-CN system displayed Chinese controls and detection states. The checks sent no inference and left chat drafts intact. Native checks also confirmed all 17 preference titles, Chinese-first descriptions, and translated last/fixed and sandbox options. Earlier checks confirmed the single-hint input and actual Codex model/effort menus. A native sequence selected a model, then an effort, and confirmed that message entry stayed open with keyboard focus and the existing draft retained. The final person avatar was separately checked beside the human role labels. Fixed-default save/reopen/reset cases and retired-branch guards are verified through production-component tests, rather than claimed as native acceptance.

Earlier native checks confirmed Markdown prose, code blocks and provider logos. Logo and provider-name centers align within 0.5 display pixels in the measured Windows view. The user sent a message and received a complete reply in this interface.

This UI verification did not rerun every provider's inference/resume/cancel checks. Their earlier backend evidence and account limitations remain separate. A fresh macOS run remains outstanding.

Earlier native Raycast checks showed the Chinese launcher with six detection states; opening WorkBuddy automatically reached model selection. This demonstrates discovery and onboarding, not successful WorkBuddy authentication.

Codex, Antigravity and Qoder CN have real inference/resume/cancel evidence. WorkBuddy still needs native CLI login, Gemini CLI is blocked by account compatibility, and international Qoder remains untested locally. See [HANDOFF.md](HANDOFF.md) for the evidence and limits.

The internal extension ID is `ai-cli-in-raycast`.
