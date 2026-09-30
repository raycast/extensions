# Commit Issue Parser

This Raycast plugin allows you to parse your issue urls (such as Jira, GitHub and GitLab) to provide you with a commit name and description that you can use with Git!

## Usage

- Open Raycast and type "Parse Issue Url"
- Enter the issue URL (Jira, GitHub or GitLab)
- Press `Enter` to paste in your active app the commit message you've selected

While typing your url, you can specify optional parameters separated by `,` in the following order:

- `url`: The issue URL (Jira, GitHub or GitLab)
- `description`: A short description of the commit
- `body`: A longer body for the commit message

## Configuration

Here are the available extension options

### Primary Action

You can customize the main action as follows

- Paste on active app: Pastes selected content (default)
- Copy & Paste on active app: Copies and pastes selected content
- Copy to Clipboard: Copies selected content

### Content Format

It allows you to make the content format compatible with your tools as follows

- Text: default mode that takes the selected text (description)
- Lazygit: integration for lazygit, fills both description and body
- Git Command: integration for Git CLI command, fills both description and body

### Type Mode

- Text: mode following the Angular convention
- Gitmoji: mode following the Gitmoji convention

## Compatibility

The extension is compatible with the following issue managers:

- GitHub
- GitLab
- Jira
