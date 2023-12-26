<br>
<br>
<p align="center">
<img src="https://github.com/k41531/snap-jot/blob/main/assets/command-icon.png?raw=true" width="140" height="140" align="center" />
</p>

<h1 align="center">SnapJot</sup></h1>

<p align="center">
This is a Raycast Extension. It allows you to quickly write a new note in your specified files.
</p>

## Usage
This extension has not been published yet. To use it, you will need to clone this repository and import it into Raycast.

### Installation
```
git clone https://github.com/k41531/snap-jot
cd snap-jot
npm install
npm run build
```
Open Raycast, run Import Extension and select the `snap-jot` folder.

### Configuration

#### Directory
The directory where your notes are stored.

#### Format
The format of the note file name. For example, if you set `YYYY-MM-DD.md` , the note file name like as `2021-10-10.md`.

#### Prefix
The prefix of the note.
For example, if you set `- HH:mm ` , the note like as  `- 12:10 somothing`.

#### Template
If the file does not exist, create a file based on the template and append it there.

You can use the following variables in the template.
- `{{date:YYYY-MM-DD}}` : The date of the note.

Example:
```
---
aliases: [{{date:YYYY/MM/DD}},{{date:YYYY年MM月DD日}}]
tags: [daily]
---
# {{date:YYYY-MM-DD}}


## Log
```
