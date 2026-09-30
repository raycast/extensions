<br>
<br>
<p align="center">
<img src="https://github.com/k41531/snap-jot/blob/main/assets/command-icon.png?raw=true" width="140" height="140" align="center" />
</p>

<h1 align="center">SnapJot</h1>

<p align="center">
Create a memo with a timestamp using this Raycast Extension. Quickly jot down notes in your specified files.
</p>

## Configuration
The SnapJot extension allows you to tailor its behavior to your needs with both required and optional settings.
### Required Settings
These settings are essential for the extension to work properly.

#### Directory
Specify the folder where your memos will be saved. Default is `~/Documents`.

#### Time Format
Choose '12' for AM/PM format, or '24' for a military-style time display. Default is '24'.

### Optional Settings
These settings are optional and can be customized according to your preference.

#### Format
The format of the note file name, e.g., `YYYY-MM-DD.md` results in `2023-12-11.md`. Default is `YYYY-MM-DD.md`.

#### Prefix
The prefix of the note, e.g., `- HH:mm ` results in `- 12:34 My first memo.` If using AM/PM format, use 'A' and set 'timeFormat' to '12'. Default is `- HH:mm `.

#### Template
If the file does not exist, SnapJot will create a new file using the specified template file and append your notes to it.

You can use `{{date:YYYY-MM-DD}}` in the template to insert the date of the note. 

template file example:
```
---
aliases: [{{date:YYYY/MM/DD}},{{date:YYYY年MM月DD日}}]
tags: [daily]
---
# {{date:YYYY-MM-DD}}


## Log
```
