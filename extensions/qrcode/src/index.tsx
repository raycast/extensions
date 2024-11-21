import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { LinkItem } from "./types";
import { generateQRCode } from "./utils";
import { AddLinkForm } from "./components/AddLinkForm";
import { useLinks } from "./hooks/useLinks";
import { useTranslation } from "./i18n";
import { DetailViewDropdown } from "./components/ViewDropDown";
import { DetailView } from "./components/DetailView";

export default function Command() {
  const { links, addLink, deleteLink } = useLinks();
  const [selectedLink, setSelectedLink] = useState<LinkItem>();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const t = useTranslation();
  const [detailView, setDetailView] = useState<string>("qrcode");

  useEffect(() => {
    if (selectedLink) {
      generateQRCode(selectedLink.url).then((url) => {
        setQrCodeUrl(url || "");
      });
    }
  }, [selectedLink]);

  const handleAddLink = (link: LinkItem) => {
    setSelectedLink(link);
    addLink(link);
  };

  const handleDeleteLink = (id: string) => {
    deleteLink(id);
    if (selectedLink?.id === id) {
      setSelectedLink(undefined);
      setQrCodeUrl("");
    }
  };

  const onDetailViewChange = (newValue: string) => {
    setDetailView(newValue);
  };

  return (
    <List
      navigationTitle={t.title}
      searchBarPlaceholder={t.searchPlaceholder}
      isShowingDetail
      searchBarAccessory={<DetailViewDropdown onDetailViewChange={onDetailViewChange} />}
      actions={
        <ActionPanel>
          <Action.Push
            title={t.addLink}
            icon={Icon.Plus}
            target={<AddLinkForm onSubmit={handleAddLink} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
      onSelectionChange={(id) => {
        const selected = links.find((link) => link.id === id);
        if (selected) {
          setSelectedLink(selected);
        }
      }}
      selectedItemId={selectedLink?.id}
    >
      {links.map((link) => (
        <List.Item
          key={link.id}
          id={link.id}
          title={link.url}
          accessories={[
            {
              tag: {
                value: link.title || null,
                color: Color.Blue,
              },
            },
          ]}
          detail={<DetailView link={link} selectedLink={selectedLink} qrCodeUrl={qrCodeUrl} viewType={detailView} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title={t.addLink}
                  icon={Icon.Plus}
                  target={<AddLinkForm onSubmit={handleAddLink} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onPop={() => {
                    setSelectedLink(links[0]);
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title={t.copyFullUrl}
                  content={link.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                {qrCodeUrl && selectedLink?.url === link.url && (
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
                  onAction={() => handleDeleteLink(link.id)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
