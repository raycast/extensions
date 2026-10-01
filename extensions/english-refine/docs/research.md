# Official documentation findings

Checked on 2026-10-01 before implementation. Sources below are first-party documentation. OpenAI documentation search and retrieval tools were used first; the Chat Completions reference returned a Markdown 404, so the live official HTML reference was opened through web browsing.

## Raycast command and review flow

- `getSelectedText(): Promise<string>` reads the frontmost application's selection and rejects if no text is selected. Catch that error and explain that the user must select text before launching the command. Do not fall back to unrelated clipboard contents. [Environment: getSelectedText](https://developers.raycast.com/api-reference/environment#getselectedtext)
- A view-mode command is a React component; its manifest name maps to a file under `src`, with `.tsx` appropriate for UI commands. Use a single `refine-text` command. [File Structure](https://developers.raycast.com/information/file-structure)
- `Detail` renders CommonMark and accepts `markdown`, `isLoading`, `navigationTitle`, and `actions`. For a faithful text preview, quote or escape the model's text rather than letting text that resembles images, links, or Markdown instructions change its presentation. Keep the original response string for clipboard actions. This rendering choice is an implementation recommendation. [Detail](https://developers.raycast.com/api-reference/user-interface/detail)
- `Action.CopyToClipboard` and `Action.Paste` are built-in actions suitable for the result view. Both close the main window after activation; Paste targets the frontmost application. Render these only after a complete result is available so reviewing the result precedes any copy or paste. [Actions](https://developers.raycast.com/api-reference/user-interface/actions#action.copytoclipboard), [Clipboard](https://developers.raycast.com/api-reference/clipboard)

## Configuration

Use extension-level preferences for only the values required by this integration. The initial implementation used a model-ID preference; the automatic discovery update replaces it with a runtime dropdown:

| Name      | Raycast type | Suggested behavior                                                                    |
| --------- | ------------ | ------------------------------------------------------------------------------------- |
| `apiKey`  | `password`   | Required; entered by the user.                                                        |
| `baseUrl` | `textfield`  | Default `https://api.openai.com/v1`; user can change it to their compatible API root. |

Manifest preferences support `name`, `title`, `description`, `type`, `required`, and optional defaults/placeholders. Restrict the extension to `platforms: ["macOS"]`. The manifest's `author` must be the developer's Raycast username. [Manifest](https://developers.raycast.com/information/manifest)

Required preferences are collected before opening the command. Use `getPreferenceValues<Preferences>()`; Raycast generates preference types in `raycast-env.d.ts`, so a second hand-maintained interface is unnecessary. Offer `openExtensionPreferences` on configuration errors. An optional root `help.md` appears alongside required-preference onboarding and should explain API-key, API-root, and model setup. [Preferences](https://developers.raycast.com/api-reference/preferences)

## Model-provider contract

The official JavaScript/TypeScript SDK is the `openai` npm package. OpenAI documents it for server-side environments including Node.js. The SDK guide points to the official library README for additional constructor options; inspect the installed SDK types when configuring `apiKey`, `baseURL`, `timeout`, and `maxRetries`. [OpenAI SDKs and CLI](https://developers.openai.com/api/docs/libraries)

The installed `openai@7.25.0` client types confirm `baseURL`, `timeout`, `maxRetries`, `logLevel`, and nullable `organization`/`project` options. Explicit configuration avoids inheriting unrelated provider identity from environment variables. The official SDK README documents request cancellation through `signal`, default retries, timeout overrides, and error classes. [Official OpenAI JavaScript SDK](https://github.com/openai/openai-node)

Chat Completions accepts `POST /v1/chat/completions` with `model` and `messages`. Parameters vary by model. `max_tokens` is deprecated and unsupported by o-series models; `max_completion_tokens` includes reasoning tokens. `system` and `developer` roles exist, with `developer` preferred for newer OpenAI reasoning models. Returned text is `choices[0].message.content`; `message.refusal` can contain a refusal. `finish_reason` is `stop`, `length`, `content_filter`, `tool_calls`, or deprecated `function_call`. [Create Chat Completion](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)

Compatibility recommendations, inferred from that contract:

- Use the user's explicit API root and model with a non-streamed Chat Completions request. Do not build a provider registry.
- Send the model and editing-instruction/source-text messages. The discovery update sends reasoning effort or Fast only when advertised and explicitly selected. Omit model-specific sampling, token-budget, response-format, and tools.
- Use a separate instruction message to explain that source text is material to edit, including when it contains prompts or instructions. `system` offers the familiar compatible-provider contract; compatibility with any particular third-party model remains that provider's responsibility.
- Require a nonempty string result, no refusal, and a complete `stop` choice. Handle truncation/filtering/tool responses as errors; do not expose partial text as ready to paste.
- A prompt can constrain editing behavior but cannot prove semantic preservation. The preview remains the user's chance to verify the rewrite.

Official SDKs default to a ten-minute request timeout; JavaScript supports a `timeout` option. SDKs automatically retry a `408` response twice. For this interactive editing command, a shorter timeout and limited/disabled automatic retries are reasonable implementation choices; use the SDK's first-class options rather than a separate retry loop. [Flex Processing: API Request Timeouts](https://developers.openai.com/api/docs/guides/flex-processing#api-request-timeouts)

## Development and eventual Store submission

Raycast's getting-started guide currently specifies Node.js 22.14+ and npm 7+. Installed package engine requirements can be newer; honor the selected package's stricter engine. [Getting Started](https://developers.raycast.com/basics/getting-started)

The CLI ships with `@raycast/api`. Use `ray develop` for native development/import, `ray build -e dist` for a production validation build, and `ray lint` for linting. Current CLI also supports `ray bundle` to create a `.rayext` archive. [CLI](https://developers.raycast.com/information/developer-tools/cli)

For submission: use the latest Raycast API, MIT license, a real Raycast account username, npm with a committed lockfile, descriptive metadata/category, and a custom 512×512 PNG icon that works with both themes. The default Raycast icon is rejected. Provide a root README for API setup and a changelog. Run build/lint and verify the distribution build in Raycast. Store screenshots are optional; up to six are supported, with three recommended, in 2000×1250 PNG format. [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)

Publishing is separate from local validation: `npm run publish` authenticates with GitHub and opens a PR in `raycast/extensions`; review and merge precede publication. Do not publish as part of a local build. [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)

## npm tooling

Use npm for the entire project: `npm ci`, `npm test`, and `npm run lint/build/dev/bundle/publish`. The committed `package-lock.json` is used locally and by Raycast's Store CI. Tests use Vitest's first-class module mocking for the Raycast host API and Node's HTTP server for the mock model provider. [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store), [Vitest](https://vitest.dev/guide/), [Module mocking](https://vitest.dev/guide/mocking/modules.html)

## Initial implementation validation

On 2026-10-01, the initial dependency installation, all eight tests, Raycast lint, and the production build passed. The icon was verified as a 512×512 PNG. A native Raycast smoke test used a local mock provider and a disposable TextEdit document: selected text reached the provider, refined/original text appeared in the preview, and the explicit Paste action replaced the selection with the exact result. The mock API key and model preferences were cleared afterward. No live model-provider request was made, so semantic editing quality still requires testing with the user's chosen model.

## CLIProxyAPI automatic discovery

Checked current official CLIProxyAPI main at commit `fd48ea6840f5572deb53aeb5657740937ac9daaa` (2026-10-01). This section addresses the later request for entirely automatic model, reasoning, and Fast controls; it supersedes the earlier manually entered model recommendation. No local model capability table is needed. [Checked commit](https://github.com/router-for-me/CLIProxyAPI/commit/fd48ea6840f5572deb53aeb5657740937ac9daaa)

### Public discovery formats

Ordinary `GET /v1/models` deliberately returns only `id`, `object`, optional `created`, and optional `owned_by`. Reasoning and service-tier metadata are stripped, even when the internal registry knows more. The route uses the ordinary inference API key, not a management key. [OpenAI models handler](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/sdk/api/handlers/openai/openai_handlers.go#L63), [API routes](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/api/server_routes.go)

The presence of a `client_version` query parameter selects a different, Codex-compatible response: `{ "models": [...] }`. This is an intentional client integration: the official Pi provider documents `/v1/models?client_version=pi`, and the official Codex guide documents this models route as a model catalog URL. The exact value `cpa` additionally enables source-tested CPA web-search capability metadata where available; it is not a standard OpenAI capability-discovery contract. Empty or unparseable version values retain modern reasoning levels; numeric versions below 0.144.0 lose `max`/`ultra`. [Official Pi provider](https://github.com/router-for-me/pi-cliproxyapi-provider), [Official Codex setup](https://help.router-for.me/agent-client/codex), [Catalog version and CPA handling](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/client/codex/models/models.go#L522)

A projection of the currently bundled catalog demonstrates the fields consumed by a client; this is an example of the response schema, not a model recommendation or a list to maintain:

```json
{
  "models": [
    {
      "slug": "gpt-6.1-sol",
      "display_name": "GPT-6.1-Sol",
      "visibility": "list",
      "input_modalities": ["text", "image"],
      "default_reasoning_level": "low",
      "supported_reasoning_levels": [
        { "effort": "low" },
        { "effort": "medium" },
        { "effort": "high" },
        { "effort": "xhigh" },
        { "effort": "max" },
        { "effort": "ultra" }
      ],
      "default_service_tier": null,
      "service_tiers": [{ "id": "priority", "name": "Fast" }]
    }
  ]
}
```

Real entries include descriptions and additional Codex fields. The catalog builder derives entries from currently available registry models, copies canonical templates where present, then sets `slug` to the exact public model ID. Aliases and prefixes remain in that ID. Merge optional metadata by exact `catalog.slug === models.data.id`; do not guess canonical IDs or strip prefixes in the extension. [Bundled catalog](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/registry/models/codex_client_models.json), [Catalog construction](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/client/codex/models/models.go#L92)

The builder can mark image/video models `visibility: "hide"`; the official Pi consumer skips hidden entries. This is a Codex picker policy, not a general declaration that a model supports Chat Completions. Explicit modalities can help reject nontext input models, but absent metadata cannot establish text-chat suitability. Do not infer support from model-name substrings. [Visibility implementation](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/client/codex/models/models.go#L715), [Pi catalog mapping](https://github.com/router-for-me/pi-cliproxyapi-provider)

### Reasoning and Fast limitations

`supported_reasoning_levels[].effort` contains discrete strings and `default_reasoning_level` names an advertised default. Explicit per-model constraints override templates; multi-provider aliases intersect constraints. Budget-only thinking models can have an empty discrete-effort list. Preserve discovered strings rather than maintaining model-specific effort lists. Missing metadata means provider-default behavior: omit `reasoning_effort`. [Constraint application](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/client/codex/models/models.go#L424), [Effort construction](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/client/codex/models/models.go#L770)

The catalog describes Codex/Responses capabilities and can exceed what the Chat Completions route accepts. In this source snapshot, bundled templates advertise `ultra`, while the corresponding native registry definitions list efforts only through `max`. Chat Completions translates `reasoning_effort` directly into Codex `reasoning.effort`, with no `ultra` to `max` conversion, and the thinking validator can reject levels absent from that registry. Native Responses has a separate passthrough path. Therefore an advertised effort is a provider claim, not a successful live compatibility probe; do not remap unknown values or conceal provider errors. This limitation is inferred from the source flow. [Chat translation](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/translator/codex/openai/chat-completions/codex_openai_request.go#L61), [Registry definitions](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/registry/models/models.json#L2813), [Validation](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/thinking/validate.go#L38), [Responses passthrough](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/thinking/apply.go#L267)

`service_tiers` is retained from the template only for recognized template models routed exclusively through Codex. Synthesized/custom entries and mixed/non-Codex routes receive an empty array. This is registry/template synthesis, not a per-account upstream eligibility probe. Offer Fast only when the catalog advertises tier ID `priority`; send that ID. Normal means omit `service_tier`. The Codex Chat Completions translator normalizes `fast` or `priority` to `priority`, preserves `ultrafast`, and drops other values. The official Pi integration ignores `additional_speed_tiers` for Fast support. [Tier synthesis](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/client/codex/models/models.go#L533), [Custom entries](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/client/codex/models/models.go#L627), [Tier normalization](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/translator/codex/openai/chat-completions/codex_openai_request.go#L780), [Official Pi Fast contract](https://github.com/router-for-me/pi-cliproxyapi-provider)

An optional catalog probe should never break ordinary model discovery: compatible providers may ignore the query and return the usual `data` shape, reject it, or return no usable metadata. Use ordinary discovery as the ID authority and enrich only exact matches. Refresh from the configured provider rather than shipping a local model catalog. This is the implementation recommendation derived from the two source-defined formats.

No separate ordinary-key capability endpoint was found in the inspected base CLIProxyAPI routes. Its management model-definition endpoint requires a separate management key and exposes static channel definitions; it is not an appropriate substitute for user model discovery. CLIProxyAPIHome's additional catalog endpoints belong to a different service. [Base routes](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/api/server_routes.go), [Management definitions](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/internal/api/handlers/management/model_definitions.go), [Management contract](https://github.com/router-for-me/CLIProxyAPI/blob/fd48ea6840f5572deb53aeb5657740937ac9daaa/docs/management-api-v8.md)

Direct OpenAI's current `GET /v1/models` schema exposes `id`, `created`, `object`, `owned_by`, and optional `shutdown_date`, without reasoning levels, service tiers, or Chat Completions compatibility. Fully automatic discovery from that endpoint alone cannot enable those model-specific controls; the accurate fallback is provider-default reasoning and normal processing. Do not introduce a manually maintained OpenAI capability chart to fill the gap. [Official OpenAI List models reference](https://developers.openai.com/api/reference/resources/models/methods/list)

## Automatic configuration UI and validation

Raycast's runtime `Form.Dropdown` accepts controlled `value`/`onChange`, searchable items, and dynamic React children. It is suitable for provider-discovered choices; manifest preference options are static. `Form.TextArea` supplies the multiline editable system prompt. `Action.SubmitForm` respects its blank-prompt validation; submission saves the prompt and model ID through `LocalStorage`, then `useNavigation` pushes the preview. Escape returns to configuration. Effort and mode start at provider default and Normal for each launch/model change; the prompt remains unchanged when models change or refresh. Selections and results remain in memory. [Form](https://developers.raycast.com/api-reference/user-interface/form), [Submit action](https://developers.raycast.com/api-reference/user-interface/actions#action.submitform), [Navigation](https://developers.raycast.com/api-reference/user-interface/navigation), [Local storage](https://developers.raycast.com/api-reference/storage)

OpenAI documents `service_tier: "default"` as standard processing; omitting it allows project settings to select a tier. Direct OpenAI Normal requests therefore explicitly use `default`. CLIProxyAPI Normal omits the field according to its translator contract above. [Create Chat Completion](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Fast mode](https://developers.openai.com/api/docs/guides/fast-mode)

The discovery update passed all 16 tests, a locked dependency install, Raycast lint, and the production build on 2026-10-01. Tests cover ordinary and rich catalogs, exact ID matching, optional-catalog failures, advertised request parameters, future effort strings, Normal defaults, hidden/nontext metadata, refresh, safe errors, and cancellation. No live OpenAI or user CLIProxyAPI generation request was made. Native automation repeatedly rejected Raycast interactions with state-change/no-window errors, so the new dropdown flow has not been visually verified; the earlier version's TextEdit preview/paste smoke test does not verify the new form.

The editable-prompt update passed all 17 tests, Raycast lint, and the production build. Tests verify that the exact custom system prompt, including meaningful whitespace and newlines, reaches each selected model separately from source text, that the original prompt remains the default, and that blank prompts are rejected before contacting the provider. Native UI testing is left to the user as requested.

## Settings and immediate replacement update

On 2026-10-01 the user clarified the final UX: the product is **Refine**, model/effort/mode/system prompt belong in a settings page, and the assigned shortcut should replace the selection immediately with status badges. This supersedes the original preview-first requirement and the inline configuration flow above.

Raycast's first-class `no-view` command mode runs without pushing a main view. `showHUD` hides the main window and shows a compact message at the bottom of the screen. The command therefore captures the selection, shows loading/refining HUD messages, loads saved settings and current discovery, calls the provider, verifies the selected text is still unchanged, then uses `Clipboard.paste` and shows completion. Failures leave source text untouched and produce an error HUD. HUD messages report actual stages rather than invented percentages; they are transient messages, not a persistent animated progress widget. [Manifest command modes](https://developers.raycast.com/information/manifest), [HUD](https://developers.raycast.com/api-reference/feedback/hud), [Clipboard](https://developers.raycast.com/api-reference/clipboard), [Selected text](https://developers.raycast.com/api-reference/environment#getselectedtext)

**Refine Settings** is a separate runtime Form. Raycast's native manifest preference dropdown requires a static `data` array, so API-discovered choices use the official Form.Dropdown API. API key and URL remain native extension preferences. Save Settings persists model, effort, and mode per API URL and the shared editable system prompt. Saved options are validated against newly discovered capabilities; an unavailable saved model requires another settings selection rather than silently choosing a different provider model. Legacy model-only storage remains readable. [Manifest preference types](https://developers.raycast.com/information/manifest#preference-properties), [Form](https://developers.raycast.com/api-reference/user-interface/form), [Local storage](https://developers.raycast.com/api-reference/storage)

All 22 tests, Raycast lint, and the production build passed. The new command integration test invokes the actual command with mocked Raycast selection/HUD/clipboard APIs and a local HTTP provider through the real OpenAI SDK. It verifies immediate paste, exact saved Low/Normal parameters and system prompt, status stages, changed-selection rejection, provider failures, and empty input.

Native testing used the user's configured local CLIProxyAPI, **gpt-6-luna**, **low**, and **Normal**, with disposable text only. Settings reopened with those values; an edited system prompt persisted and the original prompt was restored and saved. The final no-view command automatically replaced `please send draft before 5pm only if approved. dont change the 10 MB limit or ${name}.` with a clearer version preserving the approval condition, deadline, negation, 10 MB limit, and placeholder. The temporary TextEdit document was saved to `/tmp/refine-in-place-smoke.rtf` and closed. Credentials were neither inspected nor logged.

Automated global Option–1 input inserted a character in TextEdit instead of reliably triggering Raycast. Native launch testing also exposed an automation focus problem: failed selection attempts saw the coding app as the frontmost application. Explicitly activating TextEdit and invoking the launcher action succeeded. The final no-view runtime and actual automatic replacement are verified; the user's physical global shortcut remains a manual check.

## Store submission and local packaging

On 2026-10-01, the project moved to npm only, with `package-lock.json`, Vitest tests, and the official `npx @raycast/api@latest publish` script. The authenticated Raycast publisher is `francesco_castrovilli`. The unused optional React DevTools dependency was removed; `npm audit` now reports zero known vulnerabilities. All 22 tests and the CI-mode Raycast manifest, lockfile, icon, lint, and formatting checks passed. `npm run build` and `npm run bundle` produced optimized distribution builds. The built Refine Settings command was opened successfully in Raycast, discovered models from the existing configured provider, and retained the saved settings. No paid generation request was made.

The latest official CLI documents `ray bundle`, producing a `.rayext` archive. This is packaging, not Store publication. The installed public macOS Raycast 2.6.0 application has no `.rayext` document handler, and its bundled Import Extension implementation explicitly rejects bundle paths with `Extension bundles are only available in internal builds`. Therefore a production archive cannot currently be installed as a normal non-development extension on this release through that command. Public Store submission is the supported path for the requested non-development installation; Raycast's review and merge are required before the Store can install it. [Official CLI](https://developers.raycast.com/information/developer-tools/cli), [Publishing](https://developers.raycast.com/basics/publish-an-extension)
