import { ActionPanel, Action, Detail, Icon, environment } from "@raycast/api";
import { API_URL } from "@/utils/constants.util";

export function LoginFormInView() {
  // preview 등 환경 기반 추정이 불가능한 서버를 위해 현재 extensionName을 그대로 전달.
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
