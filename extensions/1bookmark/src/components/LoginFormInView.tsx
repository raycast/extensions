import { ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { API_URL } from "@/utils/constants.util";

export function LoginFormInView() {
  const loginUrl = `${API_URL.replace(/\/$/, "")}?next=raycast`;

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
