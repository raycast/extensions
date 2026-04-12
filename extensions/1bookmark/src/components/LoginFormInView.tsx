import { ActionPanel, Action, Detail, Icon, getPreferenceValues } from "@raycast/api";

export function LoginFormInView() {
  const { apiUrl } = getPreferenceValues<{ apiUrl: string }>();
  const loginUrl = `${apiUrl.replace(/\/$/, "")}?next=raycast`;

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
