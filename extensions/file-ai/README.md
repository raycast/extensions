# File AI

Make custom commands that act on selected files using Raycast AI, making use of powerful placeholders to provide relevant context.

## Commands

- Create File AI Command
    - Create a custom File AI command accessible via 'Search File AI Commands'
- Search File AI Commands
    - Search and run custom File AI commands
- Summarize Selected Files
    - Summarize the contents of selected text files, PDFs, images, audio files, and more.
- Compare Selected Files
    - Compare and contrast the contents of selected files.
- Assess File Overlap
    - Assess the overlap in ideas between the contents of two or more selected files.
- Identify Selected Files
    - Get a quick overview of the purpose and usage of a file.
- Summarize Spoken Audio
    - Summarize the spoken word content of audio files.
- File AI Chat
    - Start a back-and-forth conversation with AI with selected files provided as context.
- Import Custom File AI Commands
    - Add custom commands from a JSON string.

## Custom Commands

You can create custom File AI commands, accessed via the "Search File AI Commands" command, to execute your own prompts acting on the contents of selected files. A variety of useful defaults are provided, as listed below.

### Default Custom Commands

- Assess Academic Validity
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
- Extract Vocabulary
- Find Errors
- Generate Questions
- Historical Context
- Identify Gaps
- Identify Relationships
- Make Jingle
- Make Poem
- Make Song
- Meeting Agenda
- Pattern Analysis
- Pros And Cons
- Recommend Apps
- Respond To Last Email
- Suggest File AI Commands
- Suggest Hashtags
- Suggest Improvements
- Suggest Project Ideas
- Suggest Related File AI Prompts
- Suggest Title
- Suggest Tools
- Summarize Clipboard
- Summarize Current Tab
- Summarize Last Email
- Today's Agenda
- Table Of Contents
- Translate To English
- What Is This?
- Write Abstract
- Write Caption
- Write Conclusion
- Write Discussion
- Write Introduction

### Placeholders

When creating custom commands, you can use placeholders in your prompts that will be substituted with relevant information whenever you run the command. These placeholders range from simple information, like the current date, to complex data retrieval operations such as getting the content of the most recent email. Placeholders are a powerful way to add context to your File AI prompts. The valid placeholders are as follows:

#### File Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{contents}}` | The contents of the selected files |
| `{{files}}` | Replaced with the list of selected file paths |
| `{{fileNames}}` | Replaced with the list of selected file names |
| `{{metadata}}` | Replaced with the metadata of each file as a list below the file path |

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

#### System Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{user}}` | Replaced with the logged in user's username |
| `{{homedir}}` | The user's home directory |

### Context Data Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{currentApplication}}` | The name of the current application |
| `{{selectedText}}` | The currently selected text |
| `{{currentURL}}` | The current URL of the active tab of the active browser |
| `{{currentTabText}}` | The text content of the active tab of the active browser |
| `{{clipboardText}}` | The text of the clipboard |
| `{{currentTrack}}` | The title of the track/stream currently playing in Music.app |
| `{{musicTracks}}` | The list of track titles in Music.app |
| `{{lastNote}}` | The text of the most recently edited note in Notes.app |
| `{{lastEmail}}` | The subject, sender, and content of the most recently received email in Mail.app |
| `{{installedApps}}` | The list of installed applications |
| `{{fileAICommands}}` | The list of all custom File AI commands |
| `{{safariTopSites}}` | Your list of top visited sites in Safari |

### Other Placeholders
| Placeholder | Replaced With |
| --- | --- |
| `{{END}}` | Marks the end of a prompt -- no content, metadata, or instructions will be appended after |