import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { getEnumKeysExcludingCurrent } from "../../util";

export class AwsAction {
  public static Console = ({ url, onAction }: { url: string; onAction?: () => void }) => (
    <ActionPanel.Section title="Console">
      <Action.OpenInBrowser
        key="openConsoleLink"
        title="Open in Browser"
        url={createSsoLoginUri(url)}
        onOpen={() => onAction?.()}
      />
      <Action.CopyToClipboard
        key="copyConsoleLink"
        title="Copy Link"
        content={createSsoLoginUri(url)}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onCopy={() => onAction?.()}
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

  public static SwitchResourceType<T extends object>({
    setResourceType,
    current,
    enumType,
  }: {
    setResourceType: (resourceType: T[keyof T]) => void;
    current: T[keyof T];
    enumType: T;
  }) {
    const allKeysExceptCurrent = getEnumKeysExcludingCurrent(enumType, current);
    return (
      <ActionPanel.Section>
        <ActionPanel.Submenu
          title="Switch Resource Type"
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          filtering
          icon={Icon.Box}
        >
          {allKeysExceptCurrent.map((k) => (
            <Action
              title={`Show ${k.toString()}`}
              onAction={() => setResourceType(enumType[k])}
              key={k.toString()}
              icon={Icon.Box}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    );
  }
}

function createSsoLoginUri(uri: string): string {
  // from AWS SSO start page, start_url is https://my-sso-portal.awsapps.com/start/#
  // but in sso documentation its "https://my-sso-portal.awsapps.com/start",
  // so we should support both variants
  // https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html#sso-configure-profile-token-auto-sso
  let sso_start_url: string = "";
  if (process.env.AWS_SSO_ACCOUNT_ID && process.env.AWS_SSO_ROLE_NAME && process.env.AWS_SSO_START_URL) {
    if (process.env.AWS_SSO_START_URL!.endsWith("start")) {
      sso_start_url = process.env.AWS_SSO_START_URL! + "/#";
    } else if (process.env.AWS_SSO_START_URL!.endsWith("start/")) {
      sso_start_url = process.env.AWS_SSO_START_URL! + "#";
    } else if (process.env.AWS_SSO_START_URL!.endsWith("start/#")) {
      sso_start_url = process.env.AWS_SSO_START_URL!;
    } else {
      return uri;
    }
    return `${sso_start_url}/console?account_id=${encodeURI(process.env.AWS_SSO_ACCOUNT_ID!)}&role_name=${encodeURI(process.env.AWS_SSO_ROLE_NAME!)}&destination=${encodeURIComponent(uri)}`;
  }
  return uri;
}
