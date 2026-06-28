import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useState } from "react";
import { useContacts } from "@/hooks/useContacts";
import { useAccountInfo } from "@/hooks/useAccountInfo";
import type { Contact } from "@/types/contact";

const Detail = ({ contact, hubspotUrl }: { contact: Contact; hubspotUrl: string }) => {
  const firstname = contact?.properties?.firstname;
  const lastname = contact?.properties?.lastname;
  const company = contact?.properties?.company;
  const website = contact?.properties?.website;
  const phone = contact?.properties?.phone;
  const email = contact?.properties?.email;
  const id = contact?.id;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {firstname && <List.Item.Detail.Metadata.Label title="First Name" text={firstname} />}
          {lastname && <List.Item.Detail.Metadata.Label title="Last Name" text={lastname} />}
          {company && <List.Item.Detail.Metadata.Label title="Company" text={company} />}
          {website && <List.Item.Detail.Metadata.Link title="Website" text={website} target={website} />}
          {phone && <List.Item.Detail.Metadata.Link title="Phone" text={phone} target={`tel:${phone}`} />}
          {email && <List.Item.Detail.Metadata.Link title="Email" text={email} target={`mailto:${email}`} />}
          {id && <List.Item.Detail.Metadata.Link title="HubSpot Link" text="View in HubSpot" target={hubspotUrl} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const [search, setSearch] = useState("");
  const { isLoading, data } = useContacts({ search });
  const { isLoading: isLoadingAccountInfo, data: dataAccountInfo } = useAccountInfo();

  const contacts: Contact[] | undefined = data?.results;

  return (
    <List
      isLoading={isLoading || isLoadingAccountInfo}
      isShowingDetail={showingDetail}
      searchText={search}
      throttle
      onSearchTextChange={(search) => {
        setSearch(search);
      }}
    >
      <List.EmptyView title="No Contacts Found" icon="noview.png" />
      {contacts?.map((contact) => {
        const firstname = contact?.properties?.firstname;
        const lastname = contact?.properties?.lastname;
        const name = `${firstname ?? ""} ${lastname ?? ""}`.trim();
        const company = contact?.properties?.company;
        const website = contact?.properties?.website;
        const phone = contact?.properties?.phone;
        const email = contact?.properties?.email;
        const id = contact?.id;
        const hubspotUrl = `https://${dataAccountInfo?.uiDomain}/contacts/${dataAccountInfo?.portalId}/contact/${id}`;

        const props = showingDetail
          ? {
              detail: <Detail contact={contact} hubspotUrl={hubspotUrl} />,
            }
          : {
              accessories: [{ text: email }, { text: phone }],
            };

        return (
          <List.Item
            key={contact.id}
            title={name}
            subtitle={company}
            icon={getAvatarIcon(name)}
            keywords={[firstname, lastname]}
            id={contact.id}
            {...props}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Browser"
                  onAction={async () => {
                    await open(hubspotUrl);
                    await closeMainWindow();
                  }}
                  icon={{ source: Icon.ArrowRight }}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                {phone && <Action.OpenInBrowser title="Call" url={`tel:${phone}`} icon={Icon.Phone} />}
                {phone && <Action.OpenInBrowser title="WhatsApp" url={`https://wa.me/${phone}`} icon={Icon.Message} />}
                {email && <Action.OpenInBrowser title="Send Email" url={`mailto:${email}`} />}
                {website && <Action.OpenInBrowser title="Open Website" url={website} />}
                <ActionPanel.Submenu
                  icon={Icon.CopyClipboard}
                  title="Copy to Clipboard"
                  shortcut={Keyboard.Shortcut.Common.Copy}
                >
                  {email && <Action.CopyToClipboard title="Email" content={email} />}
                  {phone && <Action.CopyToClipboard title="Phone" content={phone} />}
                  {website && <Action.CopyToClipboard title="Website" content={website} />}
                  {name && <Action.CopyToClipboard title="Name" content={name} />}
                  {company && <Action.CopyToClipboard title="Company" content={company} />}
                </ActionPanel.Submenu>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
