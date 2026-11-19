import { Detail } from "@raycast/api";

export function ErrorView() {
  const markdown = `
  # Error
  Please check your access token and team ID.  

  ## Access Token
  You can create a Figma personal access token in Settings > Security > Personal access tokens.
  Give it the folders:read, file_content:read and file_metadata:read scopes.

  ## Team ID
  You can extract the team ID by navigating to your team page in Figma and then looking at the URL in the browser, for example:
  https://www.figma.com/files/team/<TEAM_ID>/

  Update the value for <TEAM_ID> in Raycast Preferences > Extensions > Figma...  
  then reopen the command.
  `;

  return <Detail markdown={markdown} />;
}
