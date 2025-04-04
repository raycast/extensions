# VirusTotal Raycast Extension

A Raycast extension that checks files, hashes, and URLs with VirusTotal API.

## Features

- Check file hashes (MD5, SHA1, SHA256) with VirusTotal
- Check URLs with VirusTotal
- Check selected files directly
- Check clipboard content automatically if no direct input
- View detailed reports on VirusTotal website

## Setup

1. Get a VirusTotal API key by signing up at [VirusTotal](https://www.virustotal.com)
2. Install the extension and provide your API key in the preferences

## Usage

- Use the "Check Hash or URL" command to check a hash or URL
- You can provide a hash or URL directly as a command argument
- You can also select text (hash or URL) in any application and run the command
- Select a file in Finder and run the command to check the file
- If no argument, selection, or file is provided, the command will check the clipboard content

## Requirements

- A VirusTotal API key
- Raycast v1.50.0 or higher