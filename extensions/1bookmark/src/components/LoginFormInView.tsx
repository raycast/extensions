import { ActionPanel, Action, Detail, Icon, environment } from "@raycast/api";
import { API_URL } from "@/utils/constants.util";

export function LoginFormInView() {
  // Pass the current extensionName as-is for servers (e.g. preview) that can't infer it from the environment.
  const extensionName = encodeURIComponent(environment.extensionName);
  const loginUrl = `${API_URL.replace(/\/$/, "")}?next=raycast&extensionName=${extensionName}`;

  const markdown = `
# 1Bookmark Login

Log in from your browser, then click **"Login in Raycast"**.

[Open login in browser](${loginUrl})
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Login in Browser" url={loginUrl} icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}
