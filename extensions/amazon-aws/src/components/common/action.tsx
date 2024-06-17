import { Action, ActionPanel } from "@raycast/api";
import { normalizeUrl } from "../../util";

export class AwsAction {
  public static Console = ({ url }: { url: string }) => (
    <ActionPanel.Section title="Console">
      <Action.OpenInBrowser key="openConsoleLink" title="Open in Browser" url={createSsoLoginUri(url)} />
      <Action.CopyToClipboard
        key="copyConsoleLink"
        title="Copy Link"
        content={createSsoLoginUri(url)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel.Section>
  );

  public static ExportResponse = ({ response }: { response: unknown }) => (
    <Action.CopyToClipboard
      title="Copy Service Response"
      content={JSON.stringify(response, null, 2)}
      shortcut={{ modifiers: ["opt"], key: "e" }}
    />
  );
}

function createSsoLoginUri(uri: string): string {
  let sso_login_uri: string = "";
  if (
    typeof process.env.AWS_SSO_ACCOUNT_ID !== "undefined" &&
    typeof process.env.AWS_SSO_ROLE_NAME !== "undefined" &&
    typeof process.env.AWS_SSO_START_URL !== "undefined"
  ) {
    sso_login_uri = `${process.env.AWS_SSO_START_URL}/console?account_id=${encodeURI(process.env.AWS_SSO_ACCOUNT_ID)}&role_name=${encodeURI(process.env.AWS_SSO_ROLE_NAME)}&destination=`;
  }
  return `${normalizeUrl(sso_login_uri + encodeURIComponent(uri))}`;
}
