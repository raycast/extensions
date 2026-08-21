# Multi AI Chat

Send one prompt to ChatGPT, Claude, Grok, and Perplexity from Raycast. Multi AI Chat opens each selected provider in your browser with the prompt included in its query URL, letting you use your existing browser sessions without configuring API keys.

This extension is designed for comparing or delegating work across separate provider websites. It does not combine responses inside Raycast or call model APIs directly.

## Why Multi AI Chat?

- Send the same prompt to several provider websites in one action.
- Reuse existing browser sessions without API keys or a Raycast AI subscription.
- Save parameterized prompt presets and launch them from Raycast Quicklinks.

## Commands

### Multi AI Chat

Enter a prompt, choose how many tabs to open for each provider, and submit it. Every provider defaults to one tab and can be set from zero (off) to five tabs.

Tabs open sequentially in this order:

1. ChatGPT
2. Claude
3. Grok
4. Perplexity

If one tab fails to open, the extension records the failure and continues with the remaining tabs.

### Manage AI Prompt Presets

Create, edit, and delete reusable prompt templates. A preset stores:

- A name
- A prompt template
- The number of tabs to open for each provider

Add named arguments with braces, such as:

```text
Summarize the latest developments in {topic} for an audience of {audience}.
```

Each unique argument becomes a field when the preset runs. Repeated arguments reuse the same value.

You can also create a Raycast Quicklink for a preset. Presets without arguments run immediately from their Quicklinks; presets with arguments open a form first.

### Run AI Prompt Preset

Search your saved presets and run one. Presets are stored locally by Raycast.

## Browser Preference

By default, tabs open in your system browser. You can select one of these browsers in the extension preferences:

- Google Chrome
- Safari
- Vivaldi
- Arc
- Brave
- Microsoft Edge
- Firefox

The selected browser must be installed. Provider authentication is handled by the browser, so you may need to sign in to the provider websites before using the extension.

## Privacy and Delivery

The complete prompt is placed in the `q` query parameter of every provider URL. As a result, prompts may be retained in browser history, synced between devices, logged by network infrastructure, or handled according to each provider's policies. Avoid sending secrets or sensitive information unless you accept those risks.

Multi AI Chat does not use the clipboard, AppleScript, DOM injection, API keys, or response inspection. A successful operation means the browser accepted the request to open a tab; it does not verify that a provider started or completed a response.

The extension does not truncate prompts locally. Browser and provider URL-length limits may still apply.

## Supported Platforms

Multi AI Chat supports macOS.
