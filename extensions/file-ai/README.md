# File AI

Make custom commands that act on selected files using Raycast AI, making use of powerful placeholders to provide relevant context.

## Commands

- Create File AI Command
    - Create a custom File AI command accessible via 'Search File AI Commands'
- Search File AI Commands
    - Search and run custom File AI commands
- Summarize Selected Files
    - Summarize the contents of selected text files, PDFs, images, audio files, and more.
- File AI Chat
    - Start a back-and-forth conversation with AI with selected files provided as context.
- Import File AI Commands
    - Add custom commands from a JSON string.

## Custom Commands

You can create custom File AI commands, accessed via the "Search File AI Commands" command, to execute your own prompts acting on the contents of selected files. A variety of useful defaults are provided, as listed below.

### Default Custom Commands

- Assess Academic Validity
- Assess File Overlap
- Compare Selected Files
- Compose Response
- Compose Tweet
- Condense Files
- Create Action Items
- Create Flashcards
- Create Notes
- Create Slides
- Detect Bias
- Extend Files
- Extract Code
- Extract Emails
- Extract Named Entities
- Extract Phone Numbers
- Extract URLs
- Extract Visible Text
- Extract Vocabulary
- Find Errors
- Generate Questions
- Historical Context
- Identify Gaps
- Identify Relationships
- Identify Selected Files
- Location Significance
- Make Jingle
- Make Poem
- Make Song
- Metadata Analysis
- Meeting Agenda
- Pattern Analysis
- Pros And Cons
- Recent Headlines From 68k News
- Recommend Apps
- Respond To Last Email
- Suggest File AI Commands
- Suggest Fonts
- Suggest Hashtags
- Suggest Improvements
- Suggest Project Ideas
- Suggest Related File AI Prompts
- Suggest Title
- Suggest Tools
- Summarize Clipboard
- Summarize Current Tab
- Summarize Last Email
- Summarize Spoken Audio
- Table Of Contents
- Today's Agenda
- Translate To English
- What Is This?
- Write Abstract
- Write Caption
- Write Conclusion
- Write Discussion
- Write Introduction

### Placeholders

When creating custom commands, you can use placeholders in your prompts that will be substituted with relevant information whenever you run the command. These placeholders range from simple information, like the current date, to complex data retrieval operations such as getting the content of the most recent email. Placeholders are a powerful way to add context to your File AI prompts. The valid placeholders are as follows:

### Script Placeholders

You can include AppleScript in your commands that will be run prior to sending the prompt to Raycast AI. The output of the script will be included in the final prompt. To do this, surround your script with three curly braces, {{{like this}}}. For example: 'Summarize this text: {{{tell application "TextEdit" to get text of document 1}}}'

#### URL Placeholders

You can instruct File AI to extract text from any webpage by using the {{URL}} placeholder. For example, `{{http://68k.news}}` would be replaced with the visible text of the 68k News homepage. You can use this to interface between files, data, webpages, and APIs.

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
| `{{safariTopSites}}` | Your list of top visited sites in Safari |
| `{{selectedText}}` | The currently selected text |

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
| `{{currentTabText}}` | The text content of the active tab of the active browser |
| `{{currentTrack}}` | The title of the track/stream currently playing in Music.app |
| `{{currentURL}}` | The current URL of the active tab of the active browser |
| `{{fileAICommands}}` | The list of all custom File AI commands |

#### File Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{contents}}` | The contents of the selected files |
| `{{fileNames}}` | Replaced with the list of selected file names |
| `{{files}}` | Replaced with the list of selected file paths |
| `{{metadata}}` | Replaced with the metadata of each file as a list below the file path |

#### System Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{homedir}}` | The user's home directory |
| `{{user}}` | Replaced with the logged in user's username |

#### Other Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{END}}` | Marks the end of a prompt -- no content, metadata, or instructions will be appended after |