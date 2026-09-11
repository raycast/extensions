<p align="center">
<img width=100 src="assets/icon@dark.png">
</p>

<h1 align="center">ChatGPT</h1>

<h3 align="center">
Interact with OpenAI's ChatGPT right from your command bar
</h3>

![Conversation View](metadata/1.png)

# Features

### Ask anything, from your favourite thing

Straight from your command bar, ask anything that you wanted and get an AI-generated answer without any effort.

![Ask anything](metadata/2.png)

### Personalized for you, really

Customize the model to your liking. Create and edit custom engines beyond your creativity.

![Custom model](metadata/3.png)

### Keep continue, with you

Continue talking about everything right where you left off. Be pro without from zero.

![Initial set-up](metadata/7.png)

### Save the answer, for later

Got the answer that you wanted? Great. Now you can save it without asking again.

![Saving the answer](metadata/4.png)

### Look-up your past, fast

Automatically save all the question and answer so you can go back digging for the answer you're looking, quickly.

![Looking through the question history](metadata/5.png)

### Use AI commands and create your own

Process text taken from anywhere (selected text, clipboard text, opened web page) and
insert the result into the frontmost application or copy it to the clipboard.

![Search AI commands and create a quicklink to the command and use it easily](metadata/8.png)

![AI command in action](metadata/9.png)

> Windows 11+ is supported. For vision commands, selected images are read from the active File Explorer window or from the clipboard (both platforms).

# Models

Manage chat presets and AI commands together in **Models**. Select a preset and use **Create AI Command from This Model** in its action menu to create a command with the same chat settings.

- Creating a command from **AI Commands** starts with **Independent Configuration**. Set its model ID, temperature, reasoning, vision and prompt directly; no chat preset is required or created.
- Creating a command from a preset in **Models** starts with **Inherit from a Model**. The form displays the effective settings directly. Editing a field customizes it only for that command; untouched fields continue to follow the base model. Use the action menu to reset individual fields or restore all inherited settings.
- Prompt overrides replace the base prompt; prompts are never concatenated. An empty prompt is allowed.
- Switch an inherited command to independent configuration to copy its currently effective settings and stop following the base model. Either mode can be changed later in the command form.
- Use **Ask with This Model** to start a conversation with the selected preset or command. In Ask, use **Edit Model** or **Edit AI Command** to update its configuration and return without losing the draft or conversation.
- Ask remembers models selected through **Ask with This Model**, its dropdown, or Full Text Input. Continuing an AI command or a saved conversation uses that conversation's configuration without replacing the remembered model.
- Full Text Input also supports editing the selected configuration. Subsequent requests use the saved settings.
- Existing commands migrate to independent configuration with their original settings, without creating extra model presets. Existing explicit base-model relationships are preserved. A model used by commands cannot be removed until those commands become independent or use another base model.
- Built-in commands start with independent settings. Importing models preserves any referenced base model missing from the import file, including when restoring an older backup.

**AI Commands** is available for quick execution and command management. The standalone **Create AI Command** entry has been removed; use the action menu in **Models** to create commands. Existing commands are preserved. Shortcuts or deep links to the removed entry need to be replaced with **Models**.

GPT-5 model supports vision capabilities, which can be enabled in the Models Command when creating or editing a model.
You can also enable per-model reasoning control in the model form and set the `Effort` (`none`, `low`, `medium`, `high`).
By default, reasoning effort override is disabled. When it is enabled and set to anything except `none`, the extension sends `reasoning_effort` in Chat Completions requests.

### Custom Models

Enable `Use API Endpoint` and set `API Endpoint` in preferences to use a compatible API provider.

When creating or editing a Model or AI Command, the `Model` dropdown loads model IDs from the configured API.
Search and select an available model, or type any model ID and select `Use "your-model-id"` to use it.
Manual entry is always available, including when the API cannot list models. There is no separate `Custom model` preference.
Previously saved model IDs remain selectable even if they are missing from the API response.
Azure continues to skip model discovery; enter the model ID manually.

# How to use

This extension requires a valid `Secret Key` as your API Key from [OpenAI](https://platform.openai.com/account/api-keys) with a `pay-as-you-go` plan account (**you'll get a `429` error if you're on a `free-tier` account**).

![Initial set-up](metadata/6.png)

> All the preferences value will be stored locally using [Preferences API](https://developers.raycast.com/api-reference/preferences)

# Preferences

All preferences properties list that can be customize through `Raycast Settings > Extensions > ChatGPT`

| Properties               | Label                  | Value                               | Required | Default | Description                                                                                                      |
| ------------------------ | ---------------------- | ----------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `apiKey`                 | API Key                | `string`                            | `true`   | `empty` | Your personal OpenAI API key                                                                                     |
| `useStream`              | Stream Completion      | `boolean`                           | `true`   | `true`  | Stream the completions of the generated answer                                                                   |
| `isAutoSaveConversation` | Auto-save Conversation | `boolean`                           | `true`   | `true`  | Auto-save every conversation that you had with the model                                                         |
| `isHistoryPaused`        | Pause History          | `boolean`                           | `false`  | `false` | Pause the history of the conversation                                                                            |
| `isAutoLoadText`         | Auto-load              | `boolean`                           | `false`  | `false` | Load selected text from your frontmost application to the `question bar` or `full text input form` automatically |
| `isAutoFullInput`        | Use Full Text Input    | `boolean`                           | `false`  | `false` | Switch to `full text input form` from `question bar` automatically whenever you want to ask or type a question   |
| `isAutoTTS`              | Text-to-Speech         | `boolean`                           | `false`  | `false` | Enable auto text-to-speech everytime you get a generated answer                                                  |
| `useApiEndpoint`         | Use API Endpoint       | `boolean`                           | `false`  | `false` | Change the OpenAI's default API endpoint to custom endpoint                                                      |
| `apiEndpoint`            | API Endpoint           | `string`                            | `false`  | `empty` | Custom API endpoint                                                                                              |
| `useProxy`               | Use Proxy              | `boolean`                           | `false`  | `false` | Each question request will be passed through the proxy                                                           |
| `proxyProtocol`          | Proxy Protocol         | `http`, `https`, `socks4`, `socks5` | `false`  | `http`  | Proxy protocol option                                                                                            |
| `proxyHost`              | Proxy Host             | `string`                            | `false`  | `empty` | Proxy host value                                                                                                 |
| `proxyUsername`          | Proxy Username         | `string`                            | `false`  | `empty` | Proxy username value                                                                                             |
| `proxyPassword`          | Proxy Password         | `string`                            | `false`  | `empty` | Proxy password value                                                                                             |
| `useAzure`               | Use Azure OpenAI       | `boolean`                           | `true`   | `false` | Use Azure OPENAI rather than OPENAI                                                                              |
| `azureEndpoint`          | Azure Endpoint         | `string`                            | `false`  | `empty` | Azure OpenAI resource endpoint                                                                                   |
| `azureDeploymentName`    | Azure Deployment       | `string`                            | `false`  | `empty` | Azure OpenAI resource deployment                                                                                 |

### How to use Azure OpenAI

1. Copy and paste your Azure OpenAI's `KEY` value to the `API key` field
2. Copy and paste your Azure OpenAI `Endpoint` value to the `Azure Endpoint` field. Then, Tick the `Use Azure OpenAI` checkbox

3. Copy and paste your Azure OpenAI `Model deployment name` value to the `Azure Deployment` field

# Support

Donate to support the development of this extension. Thank you!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/abielzulio)

---

<p align="right">
Made with ♥ from Indonesia
</p>
