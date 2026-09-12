import { Detail } from "@raycast/api";

export function ErrorView() {
  const markdown = `
  # Error
  Please check your access token and team ID.  

  ## Access Token
  You can find the Figma access token in your Account Settings > Personal Access Token section

  ## Team ID
  You can extract the team ID by navigating to your team page in Figma and then looking at the URL in the browser, for example:
  https://www.figma.com/files/team/<TEAM_ID>/

  Update the value for <TEAM_ID> in Raycast Preferences > Extensions > Figma...  
  then reopen the command.
  `;

  return <Detail markdown={markdown} />;
}
