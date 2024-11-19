import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { LinkItem } from "../types";
import { useTranslation } from "../i18n";
import { LinkDetail } from "./LinkDetail";

interface LinkListItemProps {
  link: LinkItem;
  selectedLink: string;
  qrCodeUrl: string;
  showMetadata: boolean;
  onToggleMetadata: () => void;
  onDeleteLink: (id: string, url: string) => void;
  onPushAddForm: () => void;
}

export function LinkListItem({ 
  link, 
  selectedLink, 
  qrCodeUrl,
  showMetadata,
  onToggleMetadata,
  onDeleteLink,
  onPushAddForm 
}: LinkListItemProps) {
  const t = useTranslation();

  return (
    <List.Item
      id={link.id}
      title={link.url}
      accessories={[
        { 
          tag: {
            value: link.title || null,
            color: Color.Blue
          }
        }
      ]}
      detail={
        <LinkDetail 
          link={link} 
          selectedLink={selectedLink} 
          qrCodeUrl={qrCodeUrl}
          showMetadata={showMetadata}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={t.addLink}
              icon={Icon.Plus}
              onAction={onPushAddForm}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title={showMetadata ? t.hideMetadata : t.showMetadata}
              icon={showMetadata ? Icon.EyeSlash : Icon.Eye}
              onAction={onToggleMetadata}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={t.copyFullUrl}
              content={link.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {qrCodeUrl && selectedLink === link.url && (
              <Action.CopyToClipboard
                title={t.copyQRCode}
                content={qrCodeUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t.deleteLink}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => onDeleteLink(link.id, link.url)}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
} 