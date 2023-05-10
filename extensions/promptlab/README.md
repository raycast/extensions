# PromptLab

A Raycast extension for creating and sharing powerful, contextually-aware AI commands using placeholders, action scripts, and more.

PromptLab allows you to create custom AI commands with prompts that utilize contextual placeholders such as {{selectedText}}, {{todayEvents}}, or {{currentApplication}} to vastly expand the capabilities of Raycast AI. PromptLab can also extract information from selected files, if you choose, so that it can tell you about the subjects in an image, summarize a PDF, and more.

PromptLab also supports "action scripts" -- AppleScripts which run with the AI's response as input. This opens a whole new world of capabilities such as allowing the AI to generate and modify files.

## Table Of Contents

- [Top-Level Commands](#top-level-commands)
- [Images](#images)
- [Create Your Own Commands](#create-your-own-commands)
    - [Placeholders](#placeholders)
        - [Command Placeholders](#command-placeholders)
        - [Script Placeholders](#script-placeholders)
        - [URL Placeholders](#url-placeholders)
        - [API Data Placeholders](#api-data-placeholders)
        - [Application Data Placeholders](#application-data-placeholders)
        - [Calendar Data Placeholders](#calendar-data-placeholders)
        - [Context Data Placeholders](#context-data-placeholders)
        - [File Data Placeholders](#file-data-placeholders)
        - [System Data Placeholders](#system-data-placeholders)
        - [Other Placeholders](#other-placeholders)
    - [Action Scripts](#action-scripts)
        - [Provided Variables](#provided-variables)
        - [Provided Handlers](#provided-handlers)
- [List Of Useful Prompts](#list-of-useful-prompts)
    - [Default Command Prompts](#default-command-prompts)
    - [Non-Default Command Prompts](#non-default-command-prompts)
- [Installation](#installation)
    - [Manual Installation](#manual-installation)
- [Custom Model Endpoints](#custom-model-endpoints)
- [Autonomous Agent Features](#autonomous-agent-features)
- [Contributing](#contributing)
- [Useful Resources](#useful-resources)

## Top-Level Commands

- New PromptLab Command
    - Create a custom PromptLab command accessible via 'Search PromptLab Commands'
- My PromptLab Commands
    - Search and run custom PromptLab commands that you've installed or created
- PromptLab Command Store
    - Explore and search commands uploaded to the store by other PromptLab users
- Summarize Selected Files
    - Summarize the contents of selected text files, PDFs, images, audio files, and more.
- PromptLab Chat
    - Start a back-and-forth conversation with AI with selected files provided as context.       
- Import PromptLab Commands
    - Add custom commands from a JSON string.

## Images
![List Of Default Commands](./examples/promptlab-1.png)
![Editing a command](./examples/promptlab-2.png)
![Customization options for commands](./examples/promptlab-3.png)
![Identify Selected Files example](./examples/promptlab-4.png)
![Recent News Headlines Example](./examples/promptlab-5.png)
![PromptLab commands as Quicklinks](./examples/promptlab-6.png)
![Navigating the PromptLab Command Store](./examples/promptlab-7.png)
![PromptLab Chat + Autonomous Agent Features](./examples/promptlab-8.png)

View more images in [the gallery](https://skaplanofficial.github.io/Raycast-PromptLab/gallery).

## Create Your Own Commands

You can create custom PromptLab commands, accessed via the "Search PromptLab Commands" command, to execute your own prompts acting on the contents of selected files. A variety of useful defaults are provided, as listed under [Default Commands](#default-commands).

### Placeholders

When creating custom commands, you can use placeholders in your prompts that will be substituted with relevant information whenever you run the command. These placeholders range from simple information, like the current date, to complex data retrieval operations such as getting the content of the most recent email. Placeholders are a powerful way to add context to your PromptLab prompts. The valid placeholders are as follows:

### Command Placeholders

You can use the name of any PromptLab command you have installed as a placeholder by surrounding it with double curly braces, `{{like this}}`. For example, if you have a command named "Summarize Selected Files", you can use the placeholder `{{Summarize Selected Files}}` to include the output of that command in your prompt for another command. This is useful for chaining commands together, but it also slows down the execution of your command, so use it wisely.

### Script Placeholders

You can include shell scripts and AppleScripts in your commands that will be run prior to sending the prompt to Raycast AI. The output of the script, limited to 2000 characters, will be included in the final prompt.

To use a shell script, surround the script with double curly braces and prefix it with `shell:`, `{{shell:like this}}`. For example, 'Summarize my current CPU usage: {{shell:top -ocpu -l 1}}'

To use an AppleScript script, surround the script with double curly braces and prefix it with `as:` or `as:`, `{{as:like this}}`. For example: 'Summarize this text: {{as:tell application "TextEdit" to get text of document 1}}'.

#### URL Placeholders

You can instruct PromptLab to extract text from any webpage by using the {{URL}} placeholder. For example, `{{http://68k.news}}` would be replaced with the visible text of the 68k News homepage. You can use this to interface between files, data, webpages, and APIs.

#### API Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{location}}` | Your current location in city, region, country format, obtained from [geojs.io](https://get.geojs.io) |
| `{{todayWeather}}` | The weather forecast for today, obtained from [open-meteo.com](https://open-meteo.com) |
| `{{weekWeather}}` | The weather forecast for the next week, obtained from [open-meteo.com](https://open-meteo.com) |

#### Application Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{installedApps}}` | The list of installed applications |
| `{{lastEmail}}` | The subject, sender, and content of the most recently received email in Mail.app |
| `{{lastNote}}` | The text of the most recently edited note in Notes.app |
| `{{musicTracks}}` | The list of track titles in Music.app |
| `{{safariBookmarks}}` | List of bookmarks in Safari |
| `{{safariTopSites}}` | Your list of top visited sites in Safari |

#### Calendar Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{date}}` | The current date (day number, month name, year) |
| `{{time}}` | The current name (hours and minutes) |
| `{{todayEvents}}` | Upcoming events over the next day |
| `{{weekEvents}}` | Upcoming events over the next 7 days |
| `{{monthEvents}}` | Upcoming events over the next month |
| `{{yearEvents}}` | Upcoming events over the next year |
| `{{todayReminders}}` | Upcoming reminders of the next day |
| `{{weekReminders}}` | Upcoming reminders over the next 7 days |
| `{{monthReminders}}` | Upcoming reminders over the next month |
| `{{yearReminders}}` | Upcoming reminders over the next year |

#### Context Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{clipboardText}}` | The text of the clipboard |
| `{{currentApplication}}` | The name of the current application |
| `{{currentDirectory}}` | The path of the current directory |
| `{{currentTabText}}` | The text content of the active tab of the active browser |
| `{{currentTrack}}` | The title of the track/stream currently playing in Music.app |
| `{{currentURL}}` | The current URL of the active tab of the active browser |
| `{{fileAICommands}}` | The list of all custom PromptLab commands |
| `{{input}}` | An input string provided by either Quicklink input or the currently selected text |
| `{{selectedText}}` | The currently selected text |

#### File Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{contents}}` | The contents of the selected files |
| `{{fileNames}}` | Replaced with the list of selected file names |
| `{{file:path}}` | The contents of a specific file on the disk. Adds the file to your current selection. |
| `{{files}}` | Replaced with the list of selected file paths |
| `{{metadata}}` | Replaced with the metadata of each file as a list below the file path |

#### System Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{computerName}}` | The computer's name (prettified form of the hostname) |
| `{{homedir}}` | The user's home directory |
| `{{hostname}}` | The computer's hostname |
| `{{user}}` | Replaced with the logged in user's username |

#### Other Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{END}}` | Marks the end of a prompt -- no content, metadata, or instructions will be appended after |

### Action Scripts

When configuring a PromptLab command, you can provide AppleScript code to execute once the AI finishes its response. You can access the response text via the `response` variable in AppleScript. Several convenient handlers for working with the response text are also provided, as listed below. Action Scripts can be used to build complex workflows using AI as a content provider, navigator, or decision-maker.

### Provided Variables
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

## Custom Model Endpoints

When you first run PromptLab, you'll have the option to configure a custom model API endpoint. If you have access to Raycast AI, you can just leave everything as-is, unless you have a particular need for a different model. You can, of course, adjust the configuration via the Raycast preferences at any time.

To use any arbitrary endpoint, put the endpoint URL in the `Model Endpoint` preference field and provide your `API Key` alongside the corresponding `Authorization Type`. Then, specify the `Input Schema` in JSON notation, using `{prompt}` to indicate where PromptLab should input its prompt. Alternatively, you can specify `{basePrompt}` and `{input}` separately, for example if you want to provide content for the user and system roles separately when using the OpenAI API. Next, specify the `Output Key` of the output text within the returned JSON object. If the model endpoint returns a string, rather than a JSON object, leave this field empty. Finally, specify the `Output Timing` of the model endpoint. If the model endpoint returns the output immediately, select `Synchronous`. If the model endpoint returns the output asynchronously, select `Asynchronous`.

### OpenAI API Example

To use the OpenAI API as the model endpoint, configure the extension as follows:

| Preference Name | Value |
| --- | --- |
| Model Endpoint | https://api.openai.com/v1/chat/completions |
| API Authorization Type | Bearer Token |
| API Key | Your API key |
| Input Schema | { "model": "gpt-4", "messages": [{"role": "user", "content": "{prompt}"}], "stream": true }
| Output Key Path | choices[0].delta.content |
| Output Timing | Asynchronous |

## Autonomous Agent Features

When using PromptLab Chat, or any command that uses a chat view, you can choose to enable autonomous agent features by checking the "Allow AI To Run Commands" checkbox. This will allow the AI to run PromptLab commands on your behalf, supplying input as needed, in order to answer your queries. For example, if you ask the AI "What's the latest news?", it might run the "Recent Headlines From 68k News" command to fulfil your request, then return the results to you. This feature is disabled by default, and can be enabled or disabled at any time.