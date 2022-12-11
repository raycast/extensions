import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useState } from "react";
import { useContacts } from "./hooks/useContacts";
import { Contact } from "./types/contact";

const Detail = ({ contact }: { contact: Contact }) => {
  const firstname = contact?.properties?.firstname;
  const lastname = contact?.properties?.lastname;
  const company = contact?.properties?.company;
  const website = contact?.properties?.website;
  const phone = contact?.properties?.phone;
  const email = contact?.properties?.email;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="First Name" text={firstname} />
          {lastname && <List.Item.Detail.Metadata.Label title="Last Name" text={lastname} />}
          {company && <List.Item.Detail.Metadata.Label title="Company" text={company} />}
          {website && <List.Item.Detail.Metadata.Link title="Website" text={website} target={website} />}
          {phone && <List.Item.Detail.Metadata.Link title="Phone" text={phone} target={`tel:${phone}`} />}
          {email && <List.Item.Detail.Metadata.Link title="Email" text={email} target={`mailto:${email}`} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const [search, setSearch] = useState("");
  const { isLoading, data } = useContacts({ search });

  const contacts: Contact[] | undefined = data?.results;

  return (
    <List
      isLoading={isLoading}
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

        const props = showingDetail
          ? {
              detail: <Detail contact={contact} />,
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
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setShowingDetail(!showingDetail)}
                />
                {phone && <Action.OpenInBrowser title="Call" url={`tel:${phone}`} icon={Icon.Phone} />}
                {phone && <Action.OpenInBrowser title="Whatsapp" url={`https://wa.me/${phone}`} icon={Icon.Message} />}
                {email && <Action.OpenInBrowser title="Send Email" url={`mailto:${email}`} />}
                {website && <Action.OpenInBrowser title="Open Website" url={website} />}
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
