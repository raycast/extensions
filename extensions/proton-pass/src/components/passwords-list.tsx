import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { PasswordsListProps } from "../api/proton-pass";
import { getFirstHostnameProvidedUrl, clearClipboardPassword } from "../helpers/helper";
import { TWO_MINUTES } from "../constants/consts";

export function AvailablePasswords({ credentials }: PasswordsListProps) {
  return (
    <List>
      {credentials?.map((credential) => {
        const hostname = getFirstHostnameProvidedUrl(credential);
        const faviconeUrl = `https://favicone.com/${hostname}?s=256`;
        const icon = { source: faviconeUrl, fallback: Icon.BlankDocument };
        return (
          <List.Item
            title={credential.metadata.name}
            icon={icon}
            subtitle={credential.content.itemEmail}
            key={credential.metadata.itemUuid}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Password"
                  content={credential.content.password}
                  concealed
                  onCopy={async () => await clearClipboardPassword(TWO_MINUTES)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
