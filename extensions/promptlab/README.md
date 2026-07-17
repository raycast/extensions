# PromptLab

PromptLab is a Raycast extension for creating and sharing powerful, contextually-aware AI commands using placeholders, action scripts, and more.

PromptLab allows you to create custom AI commands with prompts that utilize contextual placeholders such as `{{selectedText}}`, `{{todayEvents}}`, or `{{currentApplication}}` to vastly expand the capabilities of Raycast AI. PromptLab can also extract information from selected files, if you choose, so that it can tell you about the subjects in an image, summarize a PDF, and more.

PromptLab also supports "action scripts" -- AppleScripts which run with the AI's response as input, as well as experimental autonomous agent features that allow the AI to run commands on your behalf. These capabilities, paired with PromptLab's extensive customization options, open a whole new world of possibilities for enhancing your workflows with AI.

You can view images of PromptLab's output in [the gallery](https://skaplanofficial.github.io/Raycast-PromptLab/gallery).

## Table Of Contents

- [Feature Overview](#feature-overview)
- [Top-Level Commands](#top-level-commands)
- [Create Your Own Commands](#create-your-own-commands)
  - [Placeholders](#placeholders)
  - [Action Scripts](#action-scripts)
    - [Provided Variables](#provided-variables)
    - [Provided Handlers](#provided-handlers)
  - [Custom Configuration Fields](#custom-configuration-fields)
- [Chats and Autonomous Agent Features](#chats-and-autonomous-agent-features)
  - [Chats](#chats)
  - [Autonomous Agent Features](#autonomous-agent-features)
- [Custom Model Endpoints](#custom-model-endpoints)
- [Troubleshooting](#troubleshooting)
- [Privacy Policy](https://github.com/SKaplanOfficial/Raycast-PromptLab/blob/main/PRIVACY.md)

## Feature Overview

- Create, Edit, Run, and Share Custom Commands
- Detail, List, Chat, and No-View Command Types
- Utilize Numerous Contextual Placeholders in Prompts
- Use AppleScript, JXA, Shell Scripts, and JavaScript Placeholders
- Obtain Data from External APIs, Websites, and Applications
- Analyze Content of Selected Files
- Extract Text, Subjects, QR Codes, etc. from Images and Videos
- Quick Access to Commands via Menu Bar Item
- Import/Export Commands
- Save & Run Commands as Quicklinks with Optional Input Parameter
- Run AppleScript or Bash Scripts Upon Model Response
- Execute Siri Shortcuts and Use Their Output in Prompts
- PromptLab Chat with Autonomous Command Execution Capability
- Multiple Chats, Chat History, and Chat Statistics
- Chat-Specific Context Data Files
- Upload & Download Commands To/From PromptLab Command Store
- Use Custom Model Endpoints with Synchronous or Asynchronous Responses
- Favorite Commands, Chats, and Models
- Optionally Speak Responses and Provide Spoken Input
- Create Custom Placeholders with JSON

## Top-Level Commands

- New PromptLab Command
  - Create a custom PromptLab command accessible via 'My PromptLab Commands'.
- My PromptLab Commands
  - Search and run custom PromptLab commands that you've installed or created.
- Manage Models
  - View, edit, add, and delete custom models.
- PromptLab Command Store
  - Explore and search commands uploaded to the store by other PromptLab users.
- PromptLab Chat
  - Start a back-and-forth conversation with AI with selected files provided as context.
- PromptLab Menu Item
  - Displays a menu of PromptLab commands in your menu bar.
- Import PromptLab Commands
  - Add custom commands from a JSON string.

## Create Your Own Commands

You can create custom PromptLab commands, accessed via the "My PromptLab Commands" command, to execute your own prompts acting on the contents of selected files. A variety of useful defaults are provided, and you can find more in the *PromptLab Command Store*.

### Placeholders

When creating custom commands, you can use placeholders in your prompts that will be substituted with relevant information whenever you run the command. These placeholders range from simple information, like the current date, to complex data retrieval operations such as getting the content of the most recent email or running a sequence of prompts in rapid succession and amalgamating the results. Placeholders are a powerful way to add context to your PromptLab prompts.

A few examples of placeholders are:

| Placeholder | Replaced With |
| ----------- | ------------- |
| `{{clipboardText}}` | The text content of your clipboard |
| `{{selectedFiles}}` | The paths of the files you have selected |
| `{{imageText}}` | Text extracted from the image(s) you have selected |
| `{{lastNote}}`| The HTML of the most recently modified note in the Notes app |
| `{{date format="d MMMM, yyyy"}}` | The current date, optionally specifying a format |
| `{{todayEvents}}` | The events scheduled for today, including their start and end times |
| `{{youtube:[search term]}}` | The transcription of the first YouTube video result for the specified search term |
| `{{url:[url]}}` | The visible text at the specified URL |
| `{{as:...}}` | The result of the specified AppleScript code |
| `{{js:...}}` | The result of the specified JavaScript code |

These are just a few of the many placeholders available. [View the full list here](https://github.com/SKaplanOfficial/Raycast-PromptLab/blob/main/assets/placeholders_guide.md). You even create your own placeholders using JSON, if you want!

### Action Scripts

When configuring a PromptLab command, you can provide AppleScript code to execute once the AI finishes its response. You can access the response text via the `response` variable in AppleScript. Several convenient handlers for working with the response text are also provided, as listed below. Action Scripts can be used to build complex workflows using AI as a content provider, navigator, or decision-maker.

#### Provided Variables

| Variable | Value | Type |
| --- | --- | --- |
| `input` | The selected files or text input provided to the command. | String |
| `prompt` | The prompt component of the command that was run. | String |
| `response` | The full response received from the AI. | String |

#### Provided Handlers

| Handler | Purpose | Returns |
| --- | --- | --- |
| `split(theText, theDelimiter)` | Splits text around the specified delimiter. | List of String |
| `trim(theText)` | Removes leading and trailing spaces from text. | String |
| `replaceAll(theText, textToReplace, theReplacement)` | Replaces all occurrences of a string within the given text. | String |
| `rselect(theArray, numItems)` | Randomly selects the specified number of items from a list. | List |

### Custom Configuration Fields

When creating a command, you can use the `Unlock Setup Fields` action to enable custom configuration fields that must be set before the command can be run. You'll then be able to use actions to add text fields, boolean (true/false) fields, and/or number fields, providing instructions as you see fit. In your prompt, use the `{{config:fieldName}}` placeholder, camel-cased, to insert the field's current value. When you share the command to the store and others install it, they'll be prompted to fill out the custom fields before they can run the command. This is a great way to make your commands more flexible and reusable.

## Chats and Autonomous Agent Features

### Chats

Using the "PromptLab Chat" command, you can chat with AI while making use of features like placeholders and selected file contents. Chat are preserved for later reference or continuation, and you can customize each chat's name, icon, color, and other settings. Chats can have "Context Data" associated with them, ensuring that the LLM stays aware of the files, websites, and other information relevant to your conversation. Within a chat's settings, you can view various statistics highlighting how you've interacted with the AI, and you can export the chat's contents (including the statistics) to JSON for portability.

### Autonomous Agent Features

When using PromptLab Chat, or any command that uses a chat view, you can choose to enable autonomous agent features by checking the "Allow AI To Run Commands" checkbox. This will allow the AI to run PromptLab commands on your behalf, supplying input as needed, in order to answer your queries. For example, if you ask the AI "What's the latest news?", it might run the "Recent Headlines From 68k News" command to fulfil your request, then return the results to you. This feature is disabled by default, and can be enabled or disabled at any time.

## Custom Model Endpoints

When you first run PromptLab, you'll have the option to configure a custom model API endpoint. If you have access to Raycast AI, you can just leave everything as-is, unless you have a particular need for a different model. You can, of course, adjust the configuration via the Raycast preferences at any time.

To use any arbitrary endpoint, put the endpoint URL in the `Model Endpoint` preference field and provide your `API Key` alongside the corresponding `Authorization Type`. Then, specify the `Input Schema` in JSON notation, using `{prompt}` to indicate where PromptLab should input its prompt. Alternatively, you can specify `{basePrompt}` and `{input}` separately, for example if you want to provide content for the user and system roles separately when using the OpenAI API. Next, specify the `Output Key` of the output text within the returned JSON object. If the model endpoint returns a string, rather than a JSON object, leave this field empty. Finally, specify the `Output Timing` of the model endpoint. If the model endpoint returns the output immediately, select `Synchronous`. If the model endpoint returns the output asynchronously, select `Asynchronous`.

### Anthropic API Example

To use Anthropic's Claude API as the model endpoint, configure the extension as follows:

| Preference Name | Value |
| --- | --- |
| Model Endpoint | <https://api.anthropic.com/v1/complete> |
| API Authorization Type | X-API-Key |
| API Key | Your API key |
| Input Schema | {"prompt": "\n\nHuman: {{prompt}} \n\nAssistant:", "model": "claude-instant-1-100k", "max_tokens_to_sample": 3000, "stream": true } |
| Output Key Path | completion |
| Output Timing | Asynchronous |

### OpenAI API Example

To use the OpenAI API as the model endpoint, configure the extension as follows:

| Preference Name | Value |
| --- | --- |
| Model Endpoint | <https://api.openai.com/v1/chat/completions> |
| API Authorization Type | Bearer Token |
| API Key | Your API key |
| Input Schema | { "model": "gpt-4", "messages": [{"role": "user", "content": "{prompt}"}], "stream": true }
| Output Key Path | choices[0].delta.content |
| Output Timing | Asynchronous |

## Troubleshooting

If you encounter any issues with the extension, you can try the following steps to resolve them:

1. Make sure you're running the latest version of Raycast and PromptLab. I'm always working to improve the extension, so it's possible that your issue has already been fixed.
2. If you're having trouble with a command not outputting the desired response, try adjusting the command's configuration. You might just need to make small adjustments to the wording of the prompt. You can also try adjusting the included information settings to add or remove context from the prompt and guide the AI towards the desired response.
3. If you're having trouble with PromptLab Chat responding in unexpected ways, make sure the chat settings are configured correctly. If you are trying to reference selected files, you need to enable "Use Selected Files As Context". Likewise, to run other PromptLab commands automatically, you need to enable "Allow AI To Run Commands". To have the AI remember information about your conversation, you'll need to enable "Use Conversation As Context". Having multiple of these settings enabled can sometimes cause unexpected behavior, so try disabling them one at a time to see if that resolves the issue.
4. Check the [PromptLab Wiki](https://github.com/SKaplanOfficial/Raycast-PromptLab/wiki) to see if a solution to your problem is provided there.
5. If you're still having trouble, [create a new issue](https://github.com/SKaplanOfficial/Raycast-PromptLab/issues/new/choose) on GitHub with a detailed description of the issue and any relevant screenshots or information. I'll do my best to help you out!
