# Issue Parser

This Raycast plugin allows you to parse your ticket urls (Jira, Github issue) to provide you with a commit name and description that you can use with Git!

## Usage

- Open Raycast and type "Parse Issue Url"
- Enter the issue URL (Jira or GitHub)
- Press `Enter` to paste in your active app the commit message

You can press `Shift+Enter` to paste the commit body in your active app.

While typing your url, you can also specify optional parameters separated by commas in the following order:

- `url`: The issue URL (Jira or GitHub)
- `type`: The commit type used as a filter (`feat`, `fix`, etc.)
- `description`: A short description of the commit
- `body`: A longer body for the commit message
