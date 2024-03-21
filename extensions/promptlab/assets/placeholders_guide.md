# Placeholders for PromptLab

------------------------

Author: Stephen Kaplan _(HelloImSteven)_ <br />
Last Updated: 2023-08-16 <br />
PromptLab Version: 1.2.0

------------------------

## Overview

PromptLab uses a comprehensive placeholder system to enable commands with dynamic, context-aware prompts. This system is integrated into many areas of PromptLab and is currently available for use in command prompts, action scripts, and chats. Placeholders use a common syntax of `{{placeholder}}`, which some placeholders accepting additional parameters in the format `{{placeholder param1="..." param2="..."}}` and some accepting content to be evaluated in the format `{{placeholder:...}}`.

Numerous placeholders are provided out of the box, and you can create your own using [custom placeholders](#custom-placeholders).

Placeholders in PromptLab fall into four high-level categories:

| Category | Description |
| ----- | ----- |
| **Information Placeholders** | Information about the current context, e.g. `{{currentTabText}}`, `{{date}}`, and `{{selectedText}}`. These are generally instantaneous and will remain the same when use multiple times in a single pin. Generally evaluated before others kinds of placeholders. |
| **Script Placeholders** | Placeholders containing content to be evaluated as a function or script, e.g. `{{js:...}}` and `{{shell:...}}`. These are generally dynamic and have different return values for each use. Evaluated after all information placeholders. |
| **Directives** | Commands to be executed and (generally) replaced with an empty string (with some exceptions), e.g. `{{paste:...}}`, `{{ignore:...}}`, `{{images:...}}`, and `{{pdf:...}}`. Generally evaluated last. |
| **Configuration Placeholders** | Placeholders that hold the value of a custom command configuration variable, e.g. `{{config:fieldName}}`. Evaluated before all other placeholders. |

These categories are helpful for discussion purposes, but they do not define steadfast rules, nor do they signify any key differences in formatting. For example, `{{date}}` is an information placeholder that accepts a `format` parameter, therefore requiring additional processing, while `{{url:...}}` does not fit squarely into any of these categories, as it both returns information and accepts content to be evaluated. Still, these categories are helpful for understanding the general purpose of each placeholder.

All placeholders are evaluated at runtime — when you execute a command — and are replaced in order of precedence, with script placeholders generally evaluated last. Thus, you can use information placeholders in your scripts to make them even more dynamic. See [Placeholder Precedence](#placeholder-precedence) for more information on how placeholders are evaluated.

------------------------

## Built-In Placeholders

> **Note**
> Placeholders are case-sensitive unless otherwise noted.

### Directives

#### Actions

| Placeholder | Action |
| ----- | ----- |
| `{{command:...}}` | Runs a Raycast command. Replaced with empty string. Accepts up to three values in the format `{{command:commandName,extensionName,fallbackText}}`. |
| `{{copy:...}}` | Copies the specified text to the clipboard. |
| `{{cutoff [number]:...}}` | Cuts content to the specified number of characters. |
| `{{decrement:identifier}}` | Decrements the specified persistent variable by 1. |
| `{{END}}` | Ends the current prompt, ignoring all subsequent content. |
| `{{ignore:...}}` or <br /> `{{IGNORE:...}}` | Ignores all content contained within. Useful for running placeholders without inserting their return value. |
| `{{increment:identifier}}` | Increments the specified persistent variable by 1. |
| `{{paste:...}}` | Pastes the specified text into the frontmost application. |
| `{{prompt:...}}` | Runs the provided content in a sub-prompt and returns the AI's response. |
| `{{selectFile:...}}` | Adds the specified file to the current selection. |
| `{{PromptLab Command Name/ID}}` | Runs another PromptLab command in the background and returns the result. |

#### Persistent Variables

| Placeholder | Action |
| ----- | ----- |
| `{{delete [name]}}` | Deletes the persistent variable with the specified name. |
| `{{get [name]}}` | Gets the value of the persistent variable with the specified name. |
| `{{reset [name]}}` | Resets the value of the persistent variable with the specified name to its initial value. |
| `{{set [name]:...}}` | Sets the value of the persistent variable with the specified name, e.g. `{{set myVar:Hello World}}`. |

Learn more about persistent variables in [Persistent Variables](#persistent-variables).

#### Flow Control

| Placeholder | Action |
| ----- | ----- |
| `{{audio:...:...}}` | Evaluates its content only if the user has selected one or more audio files in Finder. If so, the entire placeholder is replaced with the evaluation result. |
| `{{images:...:...}}` | Evaluates its content only if the user has selected one or more image files in Finder. If so, the entire placeholder is replaced with the evaluation result. |
| `{{pdf:...:...}}` | Evaluates its content only if the user has selected one or more PDF files in Finder. If so, the entire placeholder is replaced with the evaluation result. |
| `{{textfiles:...:...}}` | Evaluates its content only if the user has selected one or more text files in Finder. If so, the entire placeholder is replaced with the evaluation result. |
| `{{videos:...:...}}` | Evaluates its content only if the user has selected one or more video files in Finder. If so, the entire placeholder is replaced with the evaluation result. |

In addition to the above, you can use any supported file extension as a directive to evaluate its content only if the user has selected one or more files with that extension in Finder. For example, `{{csv:...:...}}` will evaluate its content only if the user has selected one or more CSV files in Finder. The vast majority of file extensions are supported, but you may find some that are not. If you do, please [create an issue on GitHub](https://github.com/SKaplanOfficial/Raycast-PromptLab/issues).

> **Note**
> For file extensions with the same name as an existing placeholder, e.g. `{{js:...}}`, you must append 'files' to the end of the extension, e.g. `{{jsfiles:...}}`, to use it as a directive.

### Information Placeholders

#### Context Data

| Placeholder | Replaced With |
| ----- | ----- |
| `{{clipboardText}}` or <br /> `{{clipboard}}` | The current text content of the clipboard. |
| `{{commands}}` | The names of all PromptLab commands as a comma-separated list. |
| `{{computerName}}` | The 'pretty' hostname of the computer. |
| `{{currentAppName}}` or <br /> `{{currentApp}}` or <br /> `{{currentApplicationName}}` or <br /> `{{currentApplication}}` | The name of the frontmost application. |
| `{{currentAppPath}}` or <br /> `{{currentApplicationPath}}` | The POSIX path to the bundle of the frontmost application. |
| `{{currentAppBundleID}}` or <br /> `{{currentApplicationBundleID}}` | The bundle ID of the frontmost application. |
| `{{currentDirectory}}` | The POSIX path of Finder's current insertion location. This is the desktop if no Finder windows are open. |
| `{{currentTabText}}` or <br /> `{{tabText}}` | The visible text of the current tab of the frontmost browser window. |
| `{{currentURL}}` | The URL of the active tab of the frontmost browser window. |
| `{{homedir}}` or <br /> `{{homeDirectory}}` | The path to the user's home directory. |
| `{{hostname}}` | The hostname of the computer. |
| `{{input}}` | The text entered by the user in an input dialog. You can specify a prompt using `{{input prompt="..."}}`. |
| `{{previousCommand}}` or <br /> `{{lastCommand}}` | The name of the previously executed PromptLab command. |
| `{{previousPrompt}}` or <br /> `{{lastPrompt}}` | The fully-substituted prompt text of the previously executed PromptLab command. |
| `{{previousResponse}}` or <br /> `{{previousOutput}}` or <br /> `{{lastResponse}}` or <br /> `{{lastOutput}}` | The fully-substituted output text of the previously executed PromptLab command. |
| `{{runningApplications}}` | The names of all running applications as a comma-separated list. |
| `{{systemLanguage}}` or <br /> `{{language}}` | The configured language for the system. |
| `{{user}}` or <br /> `{{username}}` | The current user's system username. |

#### File Data

| Placeholder | Replaced With |
| ----- | ----- |
| `{{contents}}` | The text contents of currently selected file(s) in Finder. |
| `{{file:...}}` | The text content of a path at the specified path. The path can be absolute or relative to the user's home directory using `~/`. |
| `{{fileNames}}` | A comma-separated list of the names of the currently selected files in Finder. |
| `{{metadata}}` | The metadata of the currently selected file(s) in Finder. |
| `{{selectedFileContents}}` or <br /> `{{selectedFilesContents}}` or <br /> `{{selectedFileContent}}` or <br /> `{{selectedFilesContent}}` or <br /> `{{selectedFileText}}` or <br /> `{{selectedFilesText}}` or <br /> `{{contents}}` | The text content of the currently selected file(s) in Finder. |
| `{{selectedFiles}}` or <br /> `{{selectedFile}}` | A comma-separated list of POSIX paths of the currently selected files in Finder. |
| `{{selectedText}}` | The currently selected text. |

#### Images and PDFs

| Placeholder | Replaced With |
| ----- | ----- |
| `{{imageAnimals}}` | A comma-separated list of names for animals detected in currently selected image(s) in Finder. |
| `{{imageBarcodes}}` | The text contents of barcodes detected in currently selected image(s) in Finder. |
| `{{imageFaces}}` | The number of faces detected in currently selected image(s) in Finder. |
| `{{imageHorizon}}` | The angle of the horizon detected in currently selected image(s) in Finder. |
| `{{imagePOI}}` | A comma-separated list of points of interest detected in currently selected image(s) in Finder. The points are normalized to a 1x1 coordinate space. |
| `{{imageRectangles}}` | A newline-separated list of rectangles detected in currently selected image(s) in Finder. Each rectangle is represented in the format `Rectangle #1: Midpoint=(x,y) Dimensions=wxh` |
| `{{imageSubjects}}` | A comma-separated list of names for objects detected in currently selected image(s) in Finder. |
| `{{imageText}}` | The text contents of currently selected image(s) in Finder. |
| `{{pdfOCRText}}` | The OCR text contents of currently selected PDF(s) in Finder. |
| `{{pdfRawText}}` | The raw text contents (without using OCR) of currently selected PDF(s) in Finder. |

#### Application Data

| Placeholder | Replaced With |
| ----- | ----- |
| `{{currentTrack}}` or <br /> `{{currentSong}}` | The name of the currently playing track in Music.app. |
| `{{installedApps}}` or <br /> `{{installedApplications}}` or <br /> `{{apps}}` or <br /> `{{applications}}` | The names of all installed applications as a comma-separated list. |
| `{{lastEmail}}` | The text content of the last email received in Mail.app. |
| `{{lastNote}}` | The HTML text content of the last modified note in Notes.app. |
| `{{musicTracks}}` | A comma-separated list of the names of each track in Music.app. |
| `{{safariBookmarks}}` | The title and URL of each bookmark in Safari as a comma-separated list. |
| `{{safariTopSites}}` | The title and URL of each top site in Safari as a comma-separated list. |
| `{{shortcuts}}` | The comma-separated list of Siri Shortcuts installed on the system. |

#### Date and Time

| Placeholder | Replaced With |
| ----- | ----- |
| `{{date}}` or <br /> `{{currentDate}}` | The current date. Use `{{date format="..."}}` to specify a custom date format. Defaults to `MMMM d, yyyy`. |
| `{{day}}` or <br /> `{{dayName}}` or <br /> `{{currentDay}}` or <br /> `{{currentDayName}}` | The current weekday, e.g. "Monday". Defaults to en-US locale. Use format `{{day locale="xx-XX"}}` to specify a different locale. |
| `{{time}}` or <br /> `{{currentTime}}` | The current time. Use `{{time format="..."}}` to specify a custom time format. Defaults to `HH:mm:s a`. |

#### Calendar and Reminder Data

| Placeholder | Replaced With |
| ----- | ----- |
| `{{todayEvents}}` | The names, start times, and end times of all calendar events scheduled over the next 24 hours. |
| `{{weekEvents}}` | The names, start times, and end times of all calendar events scheduled over the next 7 days. |
| `{{monthEvents}}` | The names, start times, and end times of all calendar events scheduled over the next 30 days. |
| `{{yearEvents}}` | The names, start times, and end times of all calendar events scheduled over the next 365 days. |
| `{{todayReminders}}` | The names and due dates/times of all reminders scheduled over the next 24 hours. |
| `{{weekReminders}}` | The names and due dates/times of all reminders scheduled over the next 7 days. |
| `{{monthReminders}}` | The names and due dates/times of all reminders scheduled over the next 30 days. |
| `{{yearReminders}}` | The names and due dates/times of all reminders scheduled over the next 365 days. |

##### UUIDs

| Placeholder | Replaced With |
| ----- | ----- |
| `{{usedUUIDs}}` | The list of UUIDs previously used by the `{{uuid}}` placeholder since Pins' LocalStorage was last reset. |
| `{{uuid}}` or <br /> `{{UUID}}` | A unique UUID generated at runtime. |

#### On-Screen Information

| `{{focusedElement}}` or <br /> `{{activeElement}}` or <br /> `{{selectedElement}}` or <br /> `{{focusedElementText}}` or <br /> `{{activeElementText}}` or <br /> `{{selectedElementText}}` | The text content of the currently focused element in the active tab of a supported browser. Specify a browser using `{{focusedElement browser="..."}}`. |
| `{{screenContent}}` | Image vision analysis for a screen capture of the entire screen, including all windows. Primarily extracts all visible text, but also detects objects. |
| `{{windowContent}}` | Image vision analysis for a screen capture of the active window. Primarily extracts the visible text of the window, but also detects objects. |

#### External Data

| Placeholder | Replaced With |
| ----- | ----- |
| `{{elementHTML:...}}` or <br /> `{{element:...}}` or <br /> `{{HTMLOfElement:...}}` | The raw HTML source of an HTML element in the active tab of a supported browser. The first matching element will be used. Specify a browser using `{{elementHTML browser="..."}}`. |
| `{{elementText:...}}` or <br /> `{{textOfElement:...}}` | The text content of the specified HTML element, e.g. `{{elementText:#myElement}}`, `{{elementText:.myClass}}`, or `{{elementText:<body>}}`. The first matching element will be used. Specify a browser using `{{elementText browser="..."}}`. |
| `{{latitude}}` | The user's current latitude. Obtained using [geojs.io](https://get.geojs.io). |
| `{{longitude}}` | The user's current longitude. Obtained using [geojs.io](https://get.geojs.io). |
| `{{location}}` or <br /> `{{currentLocation}}` | The user's current location in the format `city, region, country`. Obtained using [geojs.io](https://get.geojs.io).
| `{{nearbyLocations:...}}` | A comma-separated list of nearby locations matching the provided query, e.g. `{{nearbyLocations:food}}`. |
| `{{todayWeather}}` | 24-hour weather forecast data at the user's current location, in JSON format. Obtained using [open-meteo.com](https://open-meteo.com).
| `{{url:...}}` or <br /> `{{URL:...}}` or <br /> `{{...}}` | The visible text content at the specified URL, e.g. `{{url:https://google.com}}` or `{{https://google.com}}`. Note: Only the HTTP(S) protocol is supported at this time. Use `{{url raw=true:https://google.com}}` to get the raw HTML of the page instead of the visible text. |
| `{{weekWeather}}` | 7-day weather forecast data at the user's current location, in JSON format. Obtained using [open-meteo.com](https://open-meteo.com).
| `{{youtube:...}}` | The transcript of the first YouTube video matching the provided query or URL, e.g. `{{youtube:how to make a sandwich}}` or `{{youtube:https://www.youtube.com/watch?v=...}}`. |

### Script Placeholders

| Placeholder | Replaced With |
| ----- | ----- |
| `{{as:...}}` or <br /> `{{AS:..}}` | The return value of an AppleScript script. |
| `{{js:...}}` or <br /> `{{JS:...}}` | The return value of sandboxed JavaScript code. See [JavaScript Placeholder Reference](#javascript-placeholder-reference) for more information. |
| `{{jxa:...}}` or <br /> `{{JXA:...}}` | The return value of a JXA script. |
| `{{shell:...}}` | The return value of a shell script. The shell is ZSH by default, but you can specify a different shell using the format `{{shell bin/bash:...}}`. |
| `{{shortcut:...}}` | The value returned after executing the specified Siri Shortcut. Specify input to the shortcut using `{{shortcut:... input="..."}}`. |

### Configuration Placeholders

| Placeholder | Replaced With |
| ----- | ----- |
| `{{config:fieldName}}` | The value of a command configuration variable.

## Placeholder Precedence

Placeholders are evaluated in order of precedence, rather than in the order they appear in a prompt. Precedence has been decided based on several factors, including how fast a placeholder executes, how often it is likely to be used, how likely it is to be used in combination with other placeholders, etc. As such, there are no concrete rules for placeholder precedence, but the following general guidelines apply:

- Placeholders that execute quickly are given higher precedence than those that execute slowly.
- Directives that don't accept content are given higher precedence than other placeholders.
- Directives that accept content are given lower precedence than other placeholders.
- Information placeholders are given higher precedence than script placeholders.
- Placeholders more likely to be used are given higher precedence than those less likely to be used.
- Placeholders that are likely to be used in combination with other placeholders as their contents are given lower precedence than those that are not.
- The `{{js:...}}` placeholder is given the lowest precedence of all script placeholders.
- The order of precedence for extension placeholders such as `{{csv:...:...}}` is determined first by their category (e.g. text files, images, videos, audio, PDFs, in that order), then alphabetically.
- Custom placeholders are given the highest precedence of all placeholders.

> **Note**
> Higher precedence means earlier evaluation.

The precedence order of individual placeholders can be difficult to conceptualize and predict; the best to find out is to try it out yourself. Here are some examples of how precedence works in practice:

- The order of most information placeholders, e.g. `{{currentDirectory}}`, `{{user}}`, `{{time}}`, etc., does not generally matter, as they either do not accept content or parameters, or it is unlikely that you'll want to use the output of another placeholder as input to them.
- `{{todayReminders}}` has higher precedence than `{{yearReminders}}` because it executes faster and is more likely to be used.
- `{{get [name]}}` has higher precedence than most other placeholders because it is unlikely that you will want to use it in combination with other placeholders, and it executes quickly.
- `{{set [name]:...}}` has lower precedence than most other placeholders because it is likely that you will want to use the output of another placeholder as input to it.
- `{{csv:...:...}}` has higher precedence than `{{jsx:...:...}}` because it occurs earlier in the alphabet.
- `{{csv:...:...}}` has higher precedence than `{{avi:...:...}}` because text files have higher precedence than videos, as they are more likely to be used.
- `{{csv:...:...}}` has higher precedence than `{{as:...}}` because it is more likely that you'd want to conditionally execute AppleScript code rather than conditionally include a script's output.
- `{{as:...}}` and `{{jxa:...}}` have higher precedence than `{{shell:...}}` because it is easier to use AppleScript and JXA to execute shell commands than the other way around.
- `{{url:...}}` has higher precedence than `{{prompt:...}}` or `{{shortcut:...}}` because it is more likely that you will want to use the contents of a URL in a prompt/as shortcut input than the other way around.
- `{{ignore:...}}` has lower precedence than `{{js:...}}` because it is more likely that you will want to use the output of a JavaScript placeholder as input to `{{ignore:...}}` than the other way around, and you can call the `ignore(content)` function in JavaScript to achieve the same result.

> **Note**
> Precedence is **not** guaranteed to remain the same in future versions of PromptLab. The guidelines above are _likely_ to remain true, but even that is not guaranteed. Any changes to precedence will be documented in the release notes.

## Technical Details

This section contains technical details about how the PromptLab placeholders system works. Content is organized alphabetically for you to easily reference as needed.

### Command Placeholders

#### PromptLab Command Placeholders

You can use the name of any PromptLab command you have installed as a placeholder by surrounding it with double curly braces, `{{like this}}`. For example, if you have a command named "Summarize Selected Files", you can use the placeholder `{{Summarize Selected Files}}` to include the output of that command in your prompt for another command. This is useful for chaining commands together, but it also slows down the execution of your command, so use it wisely. You can also use the unique ID of the command in place of its name, e.g. `{{CMa1b0bb1d-8f75-4afc-9168-9907c5e3bd87}}`. You can obtain a command's ID via the action menu within Raycast.

#### Raycast Command Placeholders

You can run commands of other Raycast extensions by specifying their name and optionally providing the extension name to disambiguate between commands with the same name, along with fallback text, using this format: `{{command:commandName:extensionName:fallbackText}}`. For example, `{{command:PromptLab Chat:PromptLab:Hello!}}` would run the "PromptLab Chat" command from the PromptLab extension and input "Hello!" into the query field.

PromptLab parses the file tree in Raycast's extension directory to map user-facing command and extension names to the names defined in each extension's _package.json_.

### Configuration Placeholders

Configuration placeholders are placeholders that hold the user-specified value of a custom command configuration variable. The value is set by the user when they try to run the command for the first time. To add a custom configuration field to a command, use the `Unlock Setup Fields` action when creating/editing a command. This wil enable some additional actions to create different types of configuration fields, e.g. text-only fields, number fields, or true/false (checkbox) fields. Each field type has a slightly different format; instructions for each type are provided within the form's info panels. Once you've setup each field as desired, use the `Lock Setup Fields` action to lock the form and save your changes. When you upload the command to the PromptLab Store, the configuration fields will be included in the command's listing.

### Custom Placeholders

Custom placeholders are placeholders defined by the user in the `custom_placeholders.json` file in the extension's support directory. To open the file for editing, use the `Edit Custom Placeholders` action from within `My PromptLab Commands`.

The key for each custom command defines the regex used to detect the placeholder. The value is a JSON object with the following properties:

| Property | Description |
| ----- | ----- |
| `name` | The internal name of the placeholder. |
| `description` | A description of the placeholder. This will appear in form info panels when the placeholder is detected. |
| `value` | The value of the placeholder. This is a string that can contain other placeholders. Use combinations of other placeholders to build complex values and/or define complex workflows. |
| `example` | An example of the placeholder in use. This will appear in form info panels when the placeholder is detected. |
| `hintRepresentation` | A representation of the placeholder that hints at how to use it. Displayed as the "name" of the placeholder in info boxes. |

You can use regex capture groups in the key to capture content that you can then use in the value. For example, consider the custom placeholder shown below:

```json
"showDialog:([\\s\\S]*?)": {
   "name": "showDialog",
   "description": "Displays a dialog window with the given text as its message.",
    "value": "{{as:display dialog \"$1\"}}",
    "example": "{{showDialog:Hello world!}}",
    "demoRepresentation": "{{showDialog:..}}"
}
```

The above placeholder, when invoked using `{{showDialog:Hello world!}}`, will display a dialog window with the message "Hello world!". Capture group 1, `$1`, is used in the value to insert the text passed to the placeholder into the AppleScript `display dialog` command. You can use multiple capture groups in the key, and refer to them using `$1`, `$2`, etc. in the value.

The precedence of custom placeholders is determined by the order in which they appear in the `custom_placeholders.json` file. The first placeholder in the file has the highest precedence, the second has the second highest precedence, and so on. Accordingly, you can use placeholders defined earlier in the file within the values of placeholders defined later in the file.

### Flow Control Directives

PromptLab provides limited support for flow control within prompts using select directives. These directives are useful for creating prompts that behave differently depending on the type(s) of files selected when a command is executed. For example, you can use `{{csv:...:...}}` to specify content that will only be evaluated if one or more CSV files are selected. All flow control directives accept two inputs: the content to include if the condition passes, and the content to include if it doesn't. For example, in `{{csv:One:Two}}`, `One` is the content to include if at least one CSV file is selected, and `Two` is the content to include if no CSV files are selected. You can also use `{{csv:...}}` to specify content that will only be evaluated if one or more CSV files are selected, with no content to include if no CSV files are selected.

You can include multiple flow control directives within a prompt to create complex workflows. Flow control directives are evaluated before script placeholders, allowing you to conditionally execute a script.

See the table in [Flow Control](#flow-control) for a list of supported directives.

### Persistent Variables

Persistent variables are placeholder-managed variables that are stored in the extension's local storage. They are useful for storing information that you want to use across multiple prompts. You can use persistent variables to store raw text or, more importantly, the output of other placeholders. For example, you can use `{{set desserts:{{prompt:Give me a list of desserts.}}}}` to store an AI-generated list of desserts in the `desserts` variable, and then use `{{get desserts}}` to include the list in another prompt at any time.

Persistent variables are managed using the following placeholder directives:

| Placeholder | Action |
| ----- | ----- |
| `{{delete [name]}}` | Deletes the persistent variable with the specified name. |
| `{{get [name]}}` | Gets the value of the persistent variable with the specified name. |
| `{{reset [name]}}` | Resets the value of the persistent variable with the specified name to its initial value. |
| `{{set [name]:...}}` | Sets the value of the persistent variable with the specified name, e.g. `{{set myVar:Hello World}}`. |

Persistent variables are stored in the extension's local storage, which means that they are not synced across devices. They are also not backed up, so if you delete the extension or clear the extension's local storage, you will lose all persistent variables (along with all custom commands, models, etc.). Persistent variables are also not encrypted, so you should not store sensitive information in them.

There is no currently any way to export persistent variables.

### Prompt Placeholders

To include sub-prompts within a command, use this placeholder format: `{{prompt:promptText}}`. Each prompt included in this way will be run sequentially, in order of occurrence, with the output of each prompt included in the final prompt. You can also nest prompts within prompts, as in `{{prompt:{{prompt:Hello}}}}`, which will use the AI's response to the first prompt as the prompt text for the second prompt. There is no limit to how deep you can nest prompts, but keep in mind that the AI will need to generate a response for each prompt, so nesting too deeply may result in long wait times.

### Script Placeholders

You can include various scripts in your commands that will be evaluated prior to sending the prompt, allowing you to include more dynamic content in your prompts.

#### AppleScript/JXA Placeholder Reference

To use an AppleScript script, surround the script with double curly braces and prefix it with `as:` or `AS:`, `{{as:like this}}`. For example: 'Summarize this text: {{as:tell application "TextEdit" to get text of document 1}}'. You can also use the `as` function in JavaScript placeholders to execute AppleScript scripts (see [JavaScript Placeholder Reference](#javascript-placeholder-reference) for more information).

To use a JavaScript for Automation (JXA) script, surround the script with double curly braces and prefix it with `jxa:` or `JXA:`, `{{jxa:like this}}`. For example: 'Summarize this text: {{jxa:Application("TextEdit").documents[0].text()}}'. You can also use the `jxa` function in JavaScript placeholders to execute JXA scripts (see [JavaScript Placeholder Reference](#javascript-placeholder-reference) for more information).

Since AppleScript and JXA code runs asynchronously, these placeholders cannot be nested.

Examples:

```js
Write a brief overview of this concept: ###{{as:tell application "Safari" to return name of current tab of window 1}}###. You might not know all the details, but please try to provide an insightful summary.
```

```js
Write a brief overview of this concept: ###{{jxa:Application("Safari").windows[0].currentTab.name()}}###. You might not know all the details, but please try to provide an insightful summary.
```

#### Shell Script Placeholder Reference

To use a shell script, surround the script with double curly braces and prefix it with `shell:`, `{{shell:like this}}`. For example, 'Summarize my current CPU usage: {{shell:top -ocpu -l 1}}'. You can specify a shell binary to use for the script by providing its path in this format: `{{shell /bin/ksh:...}}`. You can also use the `shell` function in JavaScript placeholders to execute shell scripts (see [JavaScript Placeholder Reference](#javascript-placeholder-reference) for more information).

Example:

```rust
Explain what's going on here in simple terms: {{shell:ps -a}}
```

#### JavaScript Placeholder Reference

The `{{js:...}}` placeholder allows you to execute sandboxed JavaScript code and use the return value in your pin. The code is executed in a sandboxed environment that provides read-only access to various information about the current context. All placeholders except `{{js:...}}` are available to the JavaScript code as global functions. For example, you can use `{{js:currentAppName()}}` to get the name of the frontmost application. You can combine placeholders to create more complex JavaScript code, as in the code below.

```javascript
Summarize this:

###
{{js:
const dateStr = '{{date format="MMMM d, yyyy"}}'

// Run JXA to get the name of the most played song in Music.
jxa(`(() => {
        const music = Application("Music");
        const frequentPlaylist = music.playlists["Top 25 Most Played"];
        const tracks = frequentPlaylist.tracks();
        const mostPlayedTrack = tracks[1];
        return mostPlayedTrack.name();
    })()`)

    // Play the song and get the artist.
 .then((favSong) => 
        as(`tell application "Music"
                play track "${favSong.trim()}"
                delay 1
                set theArtist to artist of current track
                stop
                return theArtist
            end tell`)
    // Search Google for songs by the artist.
 .then((theArtist) => url(`https://google.com/search?q=Journey%20dont%20stop%believin%22`)

    // Create a new note in Notes with the search results as the body, show note, then reactivate Raycast.
 .then((text) => {
        const visibleText = text.replaceAll("'", "'\\''").replaceAll('"', '\\"').replaceAll("\n", "<br /><br />")
     shell(`osascript -e 'use scripting additions' -e 'tell application "Notes"' -e 'set newNote to make new note with properties {body: "${dateStr}<br /><br />${visibleText}"}' -e 'show newNote' -e 'end tell' -e 'delay 0.5' -e 'tell application "System Events" to open location "raycast://"'`);
     return visibleText;
    })));
}}
###
```

This code, which can be set as , interweaves several placeholders to look up the artist of the currently playing song in Music, search Google for songs by that artist, and create a new note in Notes with the search results as the body. The entire placeholder then resolves to the text of the search results, which the AI will summarize for us. This particular example is a bit contrived, but it demonstrates the power of the `{{js:...}}` placeholder.

### URL Placeholders

You can instruct PromptLab to extract text from any webpage by using the `{{url:...}}` placeholder. For example, `{{url:http://68k.news}}` would be replaced with the visible text of the 68k News homepage. You can use this to interface between files, data, webpages, and APIs.

------------------------

## Resources

- [PromptLab GitHub Repository](https://github.com/SKaplanOfficial/Raycast-PromptLab)
- [Raycast Manual](https://manual.raycast.com)
- [Date Field Symbol Table](http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Field_Symbol_Table) - Official Unicode documentation for date format symbols.
- [Raycast Custom Date Format Reference](https://manual.raycast.com/snippets/reference-for-supported-alphabets-in-custom-date-format) - Straight forward reference for customizing the `{{date}}` and `{{time}}` placeholders.
- [Best practices for prompt engineering with OpenAI API](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api) - Strategies for creating effective ChatGPT prompts, from OpenAI itself
- [Brex's Prompt Engineering Guide](https://github.com/brexhq/prompt-engineering#what-is-a-prompt) - A guide to prompt engineering, with examples and in-depth explanations
