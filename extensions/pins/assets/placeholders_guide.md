# Placeholders for Raycast Pins

------------------------

Author: Stephen Kaplan _(HelloImSteven)_ <br />
Last Updated: 2023-11-01 <br />
Pins Version: 1.5.0

------------------------

## Overview

Pins supports various placeholders that are evaluated at runtime whenever you open/execute a pin. These placeholders are useful for pinning items that rely on the current context such as selected text. The placeholders system is provided as a way to supply additional functionality for users that need or want it without complicating the core functionality of Pins.

Placeholders in Pins fall into three categories: **information placeholders**, which are replaced with information about the current context, **script placeholders**, which are replaced with the return value of some script, and **directives**, which are commands for Pins to execute that are generally replaced with an empty string (with some exceptions). You can think of information placeholders as a way to get an instantaneous snapshot of the current context, without performing any additional actions, while script placeholders can be used to perform actions and process data before resolving to a string value.

All placeholders are evaluated at runtime — when you open/execute a pin — and are replaced in order of precedence, with script placeholders generally evaluated last. Thus, you can use information placeholders in your scripts to make them even more dynamic. See [Placeholder Precedence](#placeholder-precedence) for more information on how placeholders are evaluated.

### Why would I use placeholders?

Placeholders allow pins to be more dynamic and context-aware. You can use placeholders to pin common _workflows_ rather than static items. For example, you can create a pin that saves the current webpage to a specific folder in Finder, or a pin that uploads selected text to GitHub Gist.

------------------------

## Supported Placeholders

| Placeholder | Replaced With |
| ----- | ----- |
| `{{AI:...}}` or <br /> `{{AI:...}}` or <br /> `{{askAI:...}}` | The response to a Raycast AI query. Requires Raycast Pro. You can specify the model and creativity using `{{AI model="..." creativity=[decimal]}}`. The default model is `gpt-3.5-turbo` and the default creativity is `1.0`. The model must be either `gpt-3.5-turbo` or `text-davinci-003`. Creativity must be between `0.0` and `1.0`. |
| `{{alert:...}}` | Displays an alert with the specified text. Specify an optional message and timeout using `{{alert timeout=[number] title="...":...}}`. The default timeout is 10 seconds. |
| `{{dialog:...}}` | Displays a dialog with the specified text. Specify an optional title and timeout using `{{dialog timeout=[number] title="...":Message}}`. The default timeout is 30 seconds. You can accept input by providing `input=true` before the timeout, e.g. `{{dialog input=true timeout=5:Enter a number}}`. |
| `{{as:...}}` or <br /> `{{AS:..}}` | The return value of an AppleScript script. |
| `{{clipboardText}}` or <br /> `{{clipboard}}` | The current text content of the clipboard. |
| `{{copy:...}}` | Copies the specified text to the clipboard. |
| `{{currentAppBundleID}}` or <br /> `{{currentAppID}}` or <br /> `{{currentApplicationBundleID}}` or <br /> `{{currentApplicationID}}` | The bundle ID of the frontmost application. |
| `{{currentAppName}}` or <br /> `{{currentApp}}` or <br /> `{{currentApplicationName}}` or <br /> `{{currentApplication}}` | The name of the frontmost application. |
| `{{currentAppPath}}` or <br /> `{{currentApplicationPath}}` | The POSIX path to the bundle of the frontmost application. |
| `{{currentDirectory}}` | The POSIX path of Finder's current insertion location. This is the desktop if no Finder windows are open. |
| `{{currentTabText}}` or <br /> `{{tabText}}` | The visible text of the current tab of the frontmost browser window. |
| `{{currentURL}}` | The URL of the active tab of the frontmost browser window. |
| `{{date}}` or <br /> `{{currentDate}}` | The current date. Use `{{date format="..."}}` to specify a custom date format. Defaults to `MMMM d, yyyy`. |
| `{{day}}` or <br /> `{{dayName}}` or <br /> `{{currentDay}}` or <br /> `{{currentDayName}}` | The current weekday, e.g. "Monday". Defaults to en-US locale. Use format `{{day locale="xx-XX"}}` to specify a different locale. |
| `{{delete [name]}}` | Deletes the persistent variable with the specified name. |
| `{{file:...}}` | The text content of a path at the specified path. The path can be absolute or relative to the user's home directory using `~/`. |
| `{{get [name]}}` | Gets the value of the persistent variable with the specified name. |
| `{{groupNames}}` | The comma-separated list of names of all groups. Specify an amount of groups to randomly select using `{{groupNames amount=[number]}}`. |
| `{{groups}}` | The JSON representation of all groups. Specify an amount of groups to randomly select using `{{groups amount=[number]}}`. |
| `{{homedir}}` or <br /> `{{homeDirectory}}` | The path to the user's home directory. |
| `{{hostname}}` | The hostname of the computer. |
| `{{ignore:...}}` or <br /> `{{IGNORE:...}}` | Ignores all content contained within. Useful for running placeholders without inserting their return value. |
| `{{input}}` | The text entered by the user in an input dialog. You can specify a prompt using `{{input prompt="..."}}`. |
| `{{js:...}}` or <br /> `{{JS:...}}` | The return value of sandboxed JavaScript code. See [JavaScript Placeholder Reference](#javascript-placeholder-reference) for more information. |
| `{{jxa:...}}` or <br /> `{{JXA:...}}` | The return value of a JXA script. |
| `{{paste:...}}` | Pastes the specified text into the frontmost application. |
| `{{pinNames}}` | The comma-separated list of names of all pins, sorted by date last used. Specify an amount of pins to randomly select using `{{pinNames amount=[number]}}`. |
| `{{pins}}` | The JSON representation of all pins. Specify an amount of pins to randomly select using `{{pins amount=[number]}}`. |
| `{{pinTargets}}` | The newline-separated list of targets of all pins, sorted by date last used. Specify an amount of pins to randomly select using `{{pinTargets amount=[number]}}`. |
| `{{previousApp}}` or <br /> `{{previousAppName}}` or <br /> `{{lastApp}}` or <br /> `{{lastAppName}}` or <br /> `{{previousApplication}}` or <br /> `{{previousApplicationName}}` or <br /> `{{lastApplication}}` or <br /> `{{lastApplicationName}}` | The name of the last application that was active before the current one. |
| `{{previousPinName}}` or <br /> `{{lastPinName}}` | The URL-encoded name of the last pin that was opened. |
| `{{previousPinTarget}}` or <br /> `{{lastPinTarget}}` | The URL-encoded target of the last pin that was opened. |
| `{{reset [name]}}` | Resets the value of the persistent variable with the specified name to its initial value. |
| `{{runningApplications}}` or <br /> `{{runningApps}}` | A list of names of non-background applications that are currently running. The list is newline-separated by default, but you can specify a different separator using `{{runningApplications delim="..."}}`. |
| `{{say:...}}` | Speaks the specified text. You can specify a voice, speed, pitch, and volume using `{{say voice="..." speed=[number] pitch=[number] volume=[number]:...}}`. All arguments are optional and default to the system's defaults. |
| `{{selectedFileContents}}` or <br /> `{{selectedFilesContents}}` or <br /> `{{selectedFileContent}}` or <br /> `{{selectedFilesContent}}` or <br /> `{{selectedFileText}}` or <br /> `{{selectedFilesText}}` or <br /> `{{contents}}` | The text content of the currently selected file(s) in Finder. |
| `{{selectedFiles}}` or <br /> `{{selectedFile}}` | A comma-separated list of POSIX paths of the currently selected files in Finder. |
| `{{selectedText}}` | The currently selected text. |
| `{{set [name]:...}}` | Sets the value of the persistent variable with the specified name, e.g. `{{set myVar:Hello World}}`. |
| `{{shell:...}}` | The return value of a shell script. The shell is ZSH by default, but you can specify a different shell using the format `{{shell bin/bash:...}}`. |
| `{{shortcut:...}}` | The value returned after executing the specified Siri Shortcut. Specify input to the shortcut using `{{shortcut:... input="..."}}`. |
| `{{shortcuts}}` | The comma-separated list of Siri Shortcuts installed on the system. |
| `{{statistics}}` or <br /> `{{stats}}` or <br /> `{{pinStats}}` or <br /> `{{pinStatistics}}` | Statistics for all pins in tabular format. Specify a sort strategy using `{{statistics sort="[strategy]"}}`. The available strategies are "alpha", "alphabetical", "freq", "frequency", "recency", and "dateCreated". The default strategy is "frequency". You can also specify an amount of pins to randomly select using `{{statistics amount=[number]}}`. |
| `{{systemLanguage}}` or <br /> `{{language}}` | The configured language for the system. |
| `{{time}}` or <br /> `{{currentTime}}` | The current time. Use `{{time format="..."}}` to specify a custom time format. Defaults to `HH:mm:s a`. |
| `{{timezone}}` | The long name of the current timezone. |
| `{{toast:...}}` or <br /> `{{hud:...}}` | Displays a toast/HUD notification with the specified text. Specify an optional style and detailed text using `{{toast style="[success/failure/fail]" message="...":Title}}`. The default style is `success`. If the Raycast window is open when the pin is executed, the notification will display as a toast; otherwise, it will display as a HUD. |
| `{{type:...}}` | Types the specified text into the frontmost application. |
| `{{url:...}}` or <br /> `{{URL:...}}` | The visible text content at the specified URL. Example: `{{url:https://google.com}}`. |
| `{{usedUUIDs}}` | The list of UUIDs previously used by the `{{uuid}}` placeholder since Pins' LocalStorage was last reset. |
| `{{user}}` or <br /> `{{username}}` | The current user's system username. |
| `{{uuid}}` or <br /> `{{UUID}}` | A unique UUID generated at runtime. |

> **Note**
> Placeholders are case-sensitive unless otherwise noted.

## Placeholder Precedence

Placeholders are evaluated in the following order, from first to last:

| Category | Placeholder |
| -------- | ----------- |
| Directive | `{{reset [name]}}` |
| Directive | `{{get [name]}}` |
| Directive | `{{delete [name]}}` |
| Directive | `{{input}}` |
| Dropdown | `{{shortcut:...}}` |
| Information | `{{clipboardText}}` |
| Information | `{{selectedText}}` |
| Information | `{{selectedFiles}}` |
| Information | `{{selectedFileContents}}` |
| Information | `{{currentAppName}}` |
| Information | `{{currentAppPath}}` |
| Information | `{{currentAppBundleID}}` |
| Information | `{{currentDirectory}}` |
| Information | `{{currentURL}}` |
| Information | `{{currentTabText}}` |
| Information | `{{user}}` |
| Information | `{{homedir}}` |
| Information | `{{hostname}}` |
| Information | `{{shortcuts}}` |
| Information | `{{date}}` |
| Information | `{{day}}` |
| Information | `{{time}}` |
| Information | `{{timezone}}` |
| Information | `{{systemLanguage}}` |
| Information | `{{previousApp}}` |
| Information | `{{uuid}}` |
| Information | `{{usedUUIDs}}` |
| Information | `{{previousPinName}}` |
| Information | `{{previousPinTarget}}` |
| Information | `{{pinNames}}` |
| Information | `{{pinTargets}}` |
| Information | `{{pins}}` |
| Information | `{{pinStatistics}}` |
| Information | `{{groupNames}}` |
| Information | `{{groups}}` |
| Script | `{{url:...}}`** |
| Script | `{{file:...}}` |
| Directive | `{{set [name]:...}}` |
| Directive | `{{AI:...}}` |
| Directive | `{{copy:...}}` |
| Directive | `{{paste:...}}` |
| Directive | `{{type:...}}` |
| Directive | `{{alert:...}}` |
| Directive | `{{dialog:...}}` |
| Directive | `{{say:...}}` |
| Directive | `{{toast:...}}` |
| Script | `{{as:...}}` |
| Script | `{{jxa:...}}` |
| Script | `{{shell:...}}` |
| Script | `{{js:...}}` |
| Directive | `{{ignore:...}}` |

> **Note**
> Precedence may change slightly in future versions of Pins. However, script placeholders will always be evaluated after information placeholders. `{{js:...}}` and `{{ignore}}` placeholders will always be evaluated last.

> **Note**
> **Since URL placeholders involve significant processing, they are treated as script placeholders.

## JavaScript Placeholder Reference

The `{{js:...}}` placeholder allows you to execute sandboxed JavaScript code and use the return value in your pin. The code is executed in a sandboxed environment that provides read-only access to various information about the current context. All placeholders except `{{js:...}}` are available to the JavaScript code as global functions. For example, you can use `{{js:currentAppName()}}` to get the name of the frontmost application. You can combine placeholders to create more complex JavaScript code, as in the code below.

```javascript
osascript -e 'set cApp to "{{currentAppName}}"
tell application "Notes"
    set newNote to make new note with properties {body: "{{js:
        // Get the name of most played song using JavaScript for Automation
        jxa(`(() => {
                const music = Application("Music")
                const frequentPlaylist = music.playlists["Top 25 Most Played"]
                const tracks = frequentPlaylist.tracks()
                const mostPlayedTrack = tracks[1]
                return mostPlayedTrack.name()
            })()`)

        // Get the artist of the most played song using AppleScript
        .then((favSong) => 
            as(`tell application "Music"
                    activate
                    play track "${favSong.trim()}"
                    delay 1
                    set theArtist to artist of current track
                    stop
                    return theArtist
                end tell`)

        // Search Google for songs by the artist
        .then((theArtist) => url(`https://google.com/search?q=Songs%20by%20${theArtist}`)
            .then((text) => {
                // Format the text to be displayed in the note
                const dateStr = `{{date format="MMMM d, yyyy"}}`
                const visibleText = text.replaceAll("'", "'\\''").replaceAll('"', "\\\"").replaceAll("\n", "<br /><br />")
                return `${dateStr}<br /><br />${visibleText}`
            })
        ))}}"}
    show newNote
end tell
delay 1
tell application cApp to activate'
```

This code, which can be set as a Pin target, interweaves several placeholders to look up the artist of the currently playing song in Music, search Google for songs by that artist, and create a new note in Notes with the search results as the body. This particular example is a bit contrived, but it demonstrates the power of the `{{js:...}}` placeholder.

------------------------

## Resources

- [Pins GitHub Repository](https://github.com/SKaplanOfficial/Raycast-Pins)
- [PromptLab Placeholders Guide](https://github.com/SKaplanOfficial/Raycast-PromptLab#placeholders) **NOTE: Pins supports only a subset of the PromptLab placeholders.**
- [Raycast Manual](https://manual.raycast.com)
- [Date Field Symbol Table](http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Field_Symbol_Table) - Official Unicode documentation for date format symbols. Useful for customizing the `{{date}}` and `{{time}}` placeholders. Pins follows this standard.
- [Raycast Custom Date Format Reference](https://manual.raycast.com/snippets/reference-for-supported-alphabets-in-custom-date-format) - Straight forward reference for customizing the `{{date}}` and `{{time}}` placeholders; however, there may be some differences between how Raycast and Pins handle these symbols.
