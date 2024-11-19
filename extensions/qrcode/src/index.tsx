import { List, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { LinkItem } from "./types";
import { generateQRCode } from "./utils";
import { AddLinkForm } from "./components/AddLinkForm";
import { LinkListItem } from "./components/LinkListItem";
import { useLinks } from "./hooks/useLinks";
import { useTranslation } from "./i18n";
import { useShowMetadata } from "./hooks/useShowMeta";

export default function Command() {
  const { push } = useNavigation();
  const { links, addLink, deleteLink } = useLinks();
  const [selectedLink, setSelectedLink] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const t = useTranslation();
  const { needShowMetadata, showMetadata, hideMetadata } = useShowMetadata();
  useEffect(() => {
    if (selectedLink) {
      generateQRCode(selectedLink).then(url => {
        setQrCodeUrl(url || "");
      });
    }
  }, [selectedLink]);

  const handleAddLink = (link: LinkItem) => {
    addLink(link);
  };

  const handleDeleteLink = (id: string, url: string) => {
    deleteLink(id);
    if (selectedLink === url) {
      setSelectedLink("");
      setQrCodeUrl("");
    }
  };


  return (
    <List
      navigationTitle={t.title}
      searchBarPlaceholder={t.searchPlaceholder}
      isShowingDetail
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push 
              title={t.addLink} 
              icon={Icon.Plus}
              target={<AddLinkForm onSubmit={handleAddLink} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title={needShowMetadata ? t.hideMetadata : t.showMetadata}
              icon={needShowMetadata ? Icon.EyeSlash : Icon.Eye}
              onAction={needShowMetadata ? hideMetadata : showMetadata}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      onSelectionChange={(id) => {
        const selected = links.find(link => link.id === id);
        if (selected) {
          setSelectedLink(selected.url);
        }
      }}
    >
      {links.map((link) => (
        <LinkListItem
          key={link.id}
          link={link}
          selectedLink={selectedLink}
          qrCodeUrl={qrCodeUrl}
          showMetadata={needShowMetadata}
          onToggleMetadata={needShowMetadata ? hideMetadata : showMetadata}
          onDeleteLink={handleDeleteLink}
          onPushAddForm={() => push(<AddLinkForm onSubmit={handleAddLink} />)}
        />
      ))}
    </List>
  );
}