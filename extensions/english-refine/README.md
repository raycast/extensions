# Refine

A macOS Raycast extension that edits selected text into clearer, more natural English in place, using your own OpenAI-compatible model provider. Select text and press your assigned shortcut; native status badges show progress and completion.

The default editing instructions preserve meaning, intent, tone, requirements, negations, and uncertainty. Questions and prompts are edited as text rather than answered. Names, numbers, URLs, code, placeholders, and meaningful formatting are preserved. You can edit those instructions in **Refine Settings**. Model output cannot guarantee semantic equivalence; your app's normal Undo can undo the replacement.

## Installation

Refine is submitted to the public Raycast Store through a review pull request. After Raycast approves and merges the submission, search for **Refine** in Raycast's **Store** command and install it. A Store installation runs without development mode or a terminal session. The extension uses your own API access and does not require Raycast AI; your model provider's usage charges still apply.

### Production Package

Install Node.js 22.22.2 or later and npm, then run:

```sh
npm ci
npm run bundle
```

This creates `english-refine.rayext`, an optimized production archive using [Raycast's official CLI](https://developers.raycast.com/information/developer-tools/cli). Creating the archive does not install it or publish it. The public macOS Raycast 2.6.0 release currently restricts bundle imports to internal builds, so this archive is not a supported local installation route on that release.

## Configure

![Refine Settings](media/refine-settings.png)

Raycast asks for two extension preferences on first use:

| Preference   | Value                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------- |
| API Key      | Your provider's key, entered as a Raycast password preference.                                      |
| API Base URL | Defaults to `https://api.openai.com/v1`; use your provider's API root, including `/v1` if required. |

For OpenAI, create a key on the [API keys page](https://platform.openai.com/api-keys). OpenAI API usage is billed separately from ChatGPT subscriptions. For another provider, use that provider's key and base URL; endpoints requiring Azure-specific authentication or extra headers are outside this first version.

The extension uses `/models` for discovery and `/chat/completions` for refining. Do not enter either full endpoint as the base URL. HTTP is supported for local servers; use HTTPS for hosted providers. A local API without authentication can use a nonempty placeholder key if it accepts or ignores Bearer authentication.

### Automatic model configuration

Run **Refine Settings** to choose a model in the searchable dropdown, reasoning effort, mode, and system prompt. Press **Command–Return** to save. The model, effort, and mode are remembered for that API URL; the system prompt is shared across providers. **Refine Selected Text** uses these saved settings immediately, without an extra form.

Models are fetched from your configured API. **Refresh Models** (`Command–R`) reloads availability in settings. There is no bundled model list or manually maintained capability table.

**Effort** contains only the levels the provider advertises, plus **Provider Default**, which omits the reasoning parameter. **Mode** defaults to **Normal**. **Fast** appears only when the model advertises a Fast or Priority service tier and sends that exact tier; it may cost more. Changing models resets effort and mode; saved options are checked against current discovery when used. If the saved model becomes unavailable, the command asks you to choose another in settings. Choose a model that supports text Chat Completions with system messages; ordinary model lists do not establish endpoint compatibility.

For a local [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) instance, enter its API key and API root, for example `http://127.0.0.1:8317/v1` if it uses the default port. The extension automatically supplements the ordinary list with CLIProxyAPI's Codex catalog (`/models?client_version=cpa`) and matches public IDs exactly, including aliases and prefixes. The optional catalog request times out after five seconds; unavailable metadata leaves ordinary model discovery usable. Explicitly hidden or nontext catalog entries are excluded. Older instances without that catalog offer Provider Default and Normal.

Direct OpenAI model discovery works automatically, but its [Models API](https://developers.openai.com/api/reference/resources/models/methods/list) does not return reasoning levels or service tiers. Consequently, direct OpenAI connections offer **Provider Default** effort and **Normal** mode until discovery supplies those capabilities. Normal explicitly requests OpenAI's `default` service tier; compatible proxies omit the tier. The extension does not guess support from model names or probe capabilities with paid generation requests.

Catalog capabilities are provider claims. CLIProxyAPI's catalog describes Codex capabilities, and some advertised efforts can still be rejected by its Chat Completions route. If a request fails, open Refine Settings and choose Provider Default or another advertised setting. The extension does not remap effort levels or silently downgrade Fast requests.

### Editable system prompt

**Refine Settings** includes a multiline **System Prompt** field, starting with the original editing instructions. Edit it to customize how text is refined. **Save Settings** (`Command–Return`) saves the prompt locally for future launches and uses it with any selected model or provider. **Reset System Prompt** restores the original instructions; save settings to keep that reset. Refreshing or changing models keeps your current prompt.

Your prompt is sent unchanged as the system message, and selected text is sent separately as the user message. A prompt cannot be blank. Changes to the prompt can change model behavior, so retain the preservation and prompt-editing instructions if you want the original refinement behavior.

## Use

1. Set your provider preferences, then run **Refine Settings** and save your model and editing settings with **Command–Return**.
2. Assign a hotkey to **Refine Selected Text** in **Raycast Settings → Extensions → Refine**.
3. Select text in another macOS app and press that shortcut. There is no launcher, inline configuration, or preview step.
4. Native HUD badges show loading, refining, and completion. The result replaces the selected text automatically.

Keep the source app and selection in place while processing. If the selected text changes, Refine stops before pasting. Some apps do not expose selected text through macOS accessibility. If selection cannot be read, check Raycast's permission under **System Settings → Privacy & Security → Accessibility** and try a compatible app such as TextEdit.

Run **Refine Settings** to change model and editing settings, or use **Open Extension Preferences** there to change the API key and URL. Empty selections, connection failures, rejected credentials, rate limits, refusals, and incomplete results produce an error badge without changing the source text. Provider requests time out after 60 seconds and are not retried automatically.

## Privacy

Selected text, the system prompt, and your API key go directly to the configured provider when you run **Refine Selected Text**. Its billing and data policies apply. Discovery in settings sends the key but no selected text or prompt. The extension saves your custom system prompt and model, effort, and mode per API URL in Raycast's local storage. It does not save selections or results, log request content, or include analytics. Replacement uses Raycast's standard Clipboard API and clipboard behavior, including your configured clipboard history.

## Development and Store Submission

```sh
npm ci
npm test
npm run lint
npm run build
```

Tests use a local mock provider and need no API key. They verify discovery, saved settings, exact request parameters and prompt, real SDK requests, complete-result handling, cancellation, safe errors, immediate replacement, status badges, and refusing to replace a changed selection. Model behavior requires a live-provider smoke test: try text with a question, a negation, a deadline, a strict requirement, and code, then check the result retains each constraint without answering the question.

For local development, run `npm run dev`. Raycast imports the extension and starts a file watcher. Stopping that process leaves the commands installed, but Raycast still identifies this as a development extension; it is not a Store installation.

The manifest's `author` is the publisher's **Raycast account username**, `francesco_castrovilli`. The project includes a custom 512×512 PNG icon, MIT license, setup help, changelog, npm lockfile for development and Raycast's Store CI. Install and validate with `npm ci`, `npm run lint`, and `npm run build` when preparing a Store submission. Capture Store screenshots using Raycast's Window Capture.

Submit when ready using `npm run publish`, following [Raycast's Store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store) and [publishing guide](https://developers.raycast.com/basics/publish-an-extension). Publishing creates a pull request for Raycast review.

Official API research is recorded in [docs/research.md](docs/research.md).
