import { Action, ActionPanel, Application, Detail, Icon, Image, List } from "@raycast/api";

import { getFavicon } from "@raycast/utils";
import { useTotp } from "../hooks/useTotp";
import { VaultCredential } from "../types/dcli";

type Props = {
  item: VaultCredential;
  currentApplication?: Application;
};

export const ListItemPassword = ({ item, currentApplication }: Props) => {
  const { hasTotp, copyTotp, pasteTotp } = useTotp(item);
  const icon = getItemIcon(item);

  const title = item.title ?? item.url;
  const subtitle = item.email ?? item.login ?? item.secondaryLogin;

  return (
    <List.Item
      key={item.id}
      title={title}
      subtitle={subtitle}
      icon={icon}
      accessories={[
        {
          icon: hasTotp ? Icon.Key : undefined,
          tooltip: hasTotp ? "TOTP" : undefined,
        },
        {
          icon: item.note ? Icon.Paragraph : undefined,
          tooltip: item.note ? "Note" : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Password" content={item.password} icon={Icon.Key} concealed />
          <Action.Paste
            title={currentApplication ? `Paste Password into ${currentApplication.name}` : "Paste Password"}
            content={item.password}
            icon={Icon.Window}
          />

          {hasTotp && (
            <>
              <Action
                title="Copy TOTP"
                onAction={copyTotp}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title={currentApplication ? `Paste TOTP into ${currentApplication.name}` : "Paste TOTP"}
                onAction={pasteTotp}
                icon={Icon.Window}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            </>
          )}

          {(item.login !== undefined || item.email !== undefined) && (
            <Action.CopyToClipboard
              title="Copy Username"
              content={item.login ?? item.email ?? ""}
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          )}

          {item.url !== undefined && (
            <Action.OpenInBrowser url={item.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          )}

          {item.note !== undefined && (
            <Action.Push
              title="Show Note"
              target={<DetailNote name={title} note={item.note} />}
              icon={Icon.Paragraph}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
};

function DetailNote({ name, note }: { name: string; note: string }) {
  const markdown = `# 📄 ${name}
  &nbsp;
  \`\`\`
  ${note}
  \`\`\`
  `;

  return <Detail navigationTitle={`Note for ${name}`} markdown={markdown} />;
}

function isValidURL(url?: string) {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function getItemIcon(item: VaultCredential): Image.ImageLike {
  return isValidURL(item.url)
    ? getFavicon(item.url, { mask: Image.Mask.RoundedRectangle })
    : {
        source: Icon.Link,
        tintColor: Color.SecondaryText,
      };
}
