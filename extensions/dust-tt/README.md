# Ask Dust.tt

Query the [dust.tt](https://dust.tt/) service extention for [Raycast](https://www.raycast.com/)

## Setup

You need a dust.tt account to use this extension.

## Connexion

You will be able to **sign-in with your Dust account** (oauth) or using a workspace API key. You can change at any time in the extension preferences.

### Using your Dust account

Raycast will automatically show a popup to sign in with Dust.

### Using workspace API KEY and ID (legacy, will be removed)

_Using workspace API key will be removed in the future._

#### API key (optional)

You can create an API key for Dust by going to your Admin preferences, on the **Developers Tools** panel

#### Email (optional)

The email address you use to log in your Dust workspace. It enriches metrics in the usage reports.

#### Workspace ID (optional)

The ID can be found in any of the workspace's pages. It's a string of 10 chars that comes immediately after `https://dust.tt/w/` when you're logged in your Dust workspace through the web browser.

### Avanced

#### API Base URL (optional)

(optional) You can specify a custom API base URL if you have specific needs. Otherwise, it defaults to `https://dust.tt/`. (advanced usage, mostly for developping the extension).

#### OAuth client ID (optional)

(optional) You can specify a custom Oauth client ID (advanced usage, mostly for developping the extension).

#### OAuth Audience (optional)

(optional) You can specify a Oauth audience.

#### OAuth Domain (optional)

(optional) You can specify a Oauth domain (advanced usage, mostly for developping the extension).

## Commands

### Ask Dust / GPT-4 / Claude-3

Directly ask something to the Dust, GPT-4 or Claude-3 assistants.

If you ask a question with the parameter, you will get a form to add one, auto-filled with the currently selected text.

### Ask ...

Select a specific dust assistant to query

![dust-tt-1](https://github.com/alan-eu/rayast-dust/assets/467126/2c7b0b36-850b-4dde-a875-be81be78a2a2)

![dust-tt-2](https://github.com/alan-eu/rayast-dust/assets/467126/fe0638df-7401-4c5f-bdec-b98b180a1f7e)

![dust-tt-4](https://github.com/alan-eu/rayast-dust/assets/467126/d72ebb7c-64f8-438c-8608-d584a916ef97)

![dust-tt-5](https://github.com/alan-eu/rayast-dust/assets/467126/fc56f204-bce7-4a39-af34-6dbdee88ae60)

### History

Access command history

![dust-tt-6](https://github.com/alan-eu/rayast-dust/assets/467126/731d181d-7c97-4aed-a81c-8e9163a1038e)
