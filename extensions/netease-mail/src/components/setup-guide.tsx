import { Action, ActionPanel, Detail, environment, Icon, openExtensionPreferences } from "@raycast/api";

export function SetupGuide() {
  return (
    <Detail
      markdown={setupMarkdown()}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open NetEase Mail" icon={Icon.Globe} url="https://mail.163.com/" />
        </ActionPanel>
      }
    />
  );
}

function setupMarkdown(): string {
  return `# Set Up NetEase Mail

Before using this extension, enable IMAP/SMTP in NetEase Mail and create a client authorization code.

## Steps

1. On a computer, open [NetEase Mail](https://mail.163.com/) in a browser and sign in.
2. Click **设置** in the top navigation.
3. Click **POP3/SMTP/IMAP**.

![Open POP3/SMTP/IMAP settings](${assetUrl("setup-pop3-menu.jpg")})

4. Turn on both **IMAP/SMTP服务** and **POP3/SMTP服务**.
5. In **授权密码管理**, click **新增授权密码**.

![Enable services and add authorization password](${assetUrl("setup-authorization-code.png")})

6. Copy the generated authorization password into **Authorization Code** in Raycast preferences.
7. Keep the other options unchanged unless your mailbox uses a different NetEase domain.

Common defaults:

| Field | Value |
| --- | --- |
| IMAP Host | imap.163.com |
| IMAP Port | 993 |
| SMTP Host | smtp.163.com |
| SMTP Port | 465 |
`;
}

function assetUrl(name: string): string {
  const normalizedPath = `${environment.assetsPath.replace(/\\/g, "/")}/${name}`;
  return `file:///${encodeURI(normalizedPath)}`;
}
