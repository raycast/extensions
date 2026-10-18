## Find Figma Team ID

- [Sign in](https://figma.com/) and open a document from any team
- Your team ID will be available in the URL
- E.g. figma.com/files/team/[YOUR TEAM ID]/...

Multiple team IDs may be entered separated by commas.

## Nested folders

Figma lets folders contain other folders. To list files in nested folders, add a personal access token in the extension preferences:

- In Figma, go to Settings > Security > Personal access tokens
- Generate a token with the `folders:read`, `file_content:read` and `file_metadata:read` scopes
- Paste it into the "Personal Access Token" preference

Without a token, you sign in through the browser and only top-level folders are listed. Personal access tokens expire after at most 90 days, so you'll need to replace it from time to time.

> Unfortunately <b>drafts</b> are not available via the Figma API and will not be listed.
