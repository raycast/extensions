import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ContactList } from "./types";
import useHetrixTools from "./use-hetrix-tools";
import { useCachedState } from "@raycast/utils";

export default function ContactLists() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-contact-details", false);
  const { isLoading, data: contacts, pagination } = useHetrixTools<ContactList>("contact-lists");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contact list"
      pagination={pagination}
      isShowingDetail={isShowingDetail}
    >
      {contacts.map((contact) => (
        <List.Item
          key={contact.id}
          icon={Icon.Person}
          title={contact.name}
          subtitle={isShowingDetail ? undefined : contact.email[0]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={contact.id} />
                  <List.Item.Detail.Metadata.Label title="Name" text={contact.name} />
                  <List.Item.Detail.Metadata.Label title="Default" icon={contact.default ? Icon.Check : Icon.Xmark} />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Email" />
                  {contact.email.map((e, index) => (
                    <List.Item.Detail.Metadata.Link
                      key={index}
                      title={`${index + 1}`}
                      text={e}
                      target={`mailto:${e}`}
                    />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
              <Action.OpenInBrowser icon="hetrixtools.png" url="https://hetrixtools.com/dashboard/contact-lists/" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
