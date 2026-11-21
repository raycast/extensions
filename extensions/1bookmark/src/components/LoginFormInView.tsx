import { ActionPanel, Action, Detail, Icon, environment } from "@raycast/api";
import { API_URL } from "@/utils/constants.util";

export function LoginFormInView() {
  // Pass the current extensionName as-is for servers (e.g. preview) that can't infer it from the environment.
  const extensionName = encodeURIComponent(environment.extensionName);
  const loginUrl = `${API_URL.replace(/\/$/, "")}?next=raycast&extensionName=${extensionName}`;

  // The Terms of Service and Privacy Policy live on the web. Logging in on the web records the consent.
  const termsUrl = new URL("/terms", API_URL).toString();
  const privacyUrl = new URL("/privacy", API_URL).toString();

  const markdown = `
# 1Bookmark Login

Log in from your browser, then click **"Login in Raycast"**.

[Open login in browser](${loginUrl})

By continuing, you agree to 1Bookmark's [Terms of Service](${termsUrl}) and [Privacy Policy](${privacyUrl}).
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
