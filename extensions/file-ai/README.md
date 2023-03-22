# File AI

Summarize, compare, translate, and act on selected files using Raycast AI

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

## Custom Commands

You can create custom File AI commands, accessed via the "Search File AI Commands" command, to execute your own prompts acting on the contents of selected files. A variety of useful defaults are provided, as listed below.

### Default Custom Commands

- Assess Academic Validity
- Compose Response
- Compose Tweet
- Create Action Items
- Create Flashcards
- Create Notes
- Create Slides
- Detect Bias
- Extract Emails
- Extract Named Entities
- Extract Phone Numbers
- Extract URLs
- Extract Vocabulary
- Find Errors
- Generate Questions
- Identify Gaps
- Make Jingle
- Make Poem
- Make Song
- Meeting Agenda
- Pattern Analysis
- Suggest File AI Prompts
- Suggest Hashtags
- Suggest Title
- Suggest Tools
- Table Of Contents
- Translate To English
- Write Abstract
- Write Caption
- Write Conclusion
- Write Discussion
- Write Introduction

### Placeholders

When creating custom commands, you can use placeholders in your prompts that will be substituted with relevant information whenever you run the command. The valid placeholders are as follows:

- {{contents}} - The contents of the selected files
- {{date}} - The UTC representation of the current date and time
- {{END}} - Marks the end of a prompt -- no content, metadata, or instructions will be appended after
- {{files}} - Replaced with the list of selected file paths
- {{fileNames}} - Replaced with the list of selected file names
- {{metadata}} - Replaced with the metadata of each file as a list below the file path
- {{user}} - Replaced with the logged in user's username