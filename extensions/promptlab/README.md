# PromptLab

PromptLab is a Raycast extension for creating and sharing powerful, contextually-aware AI commands using placeholders, action scripts, and more.

PromptLab allows you to create custom AI commands with prompts that utilize contextual placeholders such as `{{selectedText}}`, `{{todayEvents}}`, or `{{currentApplication}}` to vastly expand the capabilities of Raycast AI. PromptLab can also extract information from selected files, if you choose, so that it can tell you about the subjects in an image, summarize a PDF, and more.

PromptLab also supports "action scripts" -- AppleScripts which run with the AI's response as input, as well as experimental autonomous agent features that allow the AI to run commands on your behalf. These capabilities, paired with PromptLab's extensive customization options, open a whole new world of possibilities for enhancing your workflows with AI.

## Top-Level Commands

- New PromptLab Command
    - Create a custom PromptLab command accessible via 'My PromptLab Commands'
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

## Create Your Own Commands

You can create custom PromptLab commands, accessed via the "My PromptLab Commands" command, to execute your own prompts acting on the contents of selected files.

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

#### Persistent Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{increment:identifier}}` | The value of the local storage entry whose key is `identifier`, increased by 1 |
| `{{decrement:identifier}}` | The value of the local storage entry whose key is `identifier`, decreased by 1 |

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

## Troubleshooting

If you encounter any issues with the extension, you can try the following steps to resolve them:

1. Make sure you're running the latest version of Raycast and PromptLab. I'm always working to improve the extension, so it's possible that your issue has already been fixed.
2. If you're having trouble with a command not outputting the desired response, try adjusting the command's configuration. You might just need to make small adjustments to the wording of the prompt. You can also try adjusting the included information settings to add or remove context from the prompt and guide the AI towards the desired response.
3. If you're having trouble with PromptLab Chat responding in unexpected ways, make sure the chat settings are configured correctly. If you are trying to reference selected files, you need to enable "Use Selected Files As Context". Likewise, to run other PromptLab commands automatically, you need to enable "Allow AI To Run Commands". To have the AI remember information about your conversation, you'll need to enable "Use Conversation As Context". Having multiple of these settings enabled can sometimes cause unexpected behavior, so try disabling them one at a time to see if that resolves the issue.
4. Check the [PromptLab Wiki](https://github.com/SKaplanOfficial/Raycast-PromptLab/wiki) to see if a solution to your problem is provided there.
5. If you're still having trouble, [create a new issue](https://github.com/SKaplanOfficial/Raycast-PromptLab/issues/new/choose) on GitHub with a detailed description of the issue and any relevant screenshots or information. I'll do my best to help you out!