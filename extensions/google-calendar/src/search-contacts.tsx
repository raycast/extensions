import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useContacts, withGoogleAPIs } from "./lib/google";
import { useState } from "react";
import { getAvatarIcon } from "@raycast/utils";
import { people_v1 } from "@googleapis/people";

function getIcon(contact: people_v1.Schema$Person) {
  const profileUrl = contact.photos?.find((photo) => photo.metadata?.source?.type === "PROFILE")?.url;
  if (profileUrl) {
    const icon: Image = {
      source: profileUrl,
      fallback: Icon.Person,
      mask: Image.Mask.Circle,
    };
    return icon;
  }

  const name = contact.names?.[0]?.displayName ?? contact.emailAddresses?.[0]?.value;
  if (name) {
    return getAvatarIcon(name);
  }

  return Icon.Person;
}

function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { data, isLoading } = useContacts(searchText);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      searchBarPlaceholder="Search contacts..."
      onSearchTextChange={setSearchText}
    >
      {data?.map((contact) => (
        <List.Item
          key={contact.resourceName}
          icon={getIcon(contact)}
          title={contact.emailAddresses?.[0]?.value ?? "-"}
          subtitle={contact.names?.[0]?.displayName ?? undefined}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Email" content={contact.emailAddresses?.[0]?.value ?? "-"} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withGoogleAPIs(Command);
