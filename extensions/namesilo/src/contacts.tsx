import { Icon, List } from "@raycast/api";
import useNameSilo from "./lib/hooks/useNameSilo";
import { ArrOrObjOrNull, Contact } from "./lib/types";
import { parseAsArray } from "./lib/utils/parseAsArray";

export default function Contacts() {
  type ContactResponse = { contact: ArrOrObjOrNull<Contact> };
  const { isLoading, data } = useNameSilo<ContactResponse>("contactList");
  const contacts = parseAsArray(data?.contact);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search contact" isShowingDetail>
      <List.Section title={`${contacts.length} contacts`}>
        {contacts.map((contact) => (
          <List.Item
            key={contact.contact_id}
            icon={Icon.Phone}
            title={contact.nickname}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Company" text={contact.company} />
                    <List.Item.Detail.Metadata.Label title="First Name" text={contact.first_name} />
                    <List.Item.Detail.Metadata.Label title="Last Name" text={contact.last_name} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Address" text={contact.address} />
                    <List.Item.Detail.Metadata.Label title="Address2" text={contact.address2} />
                    <List.Item.Detail.Metadata.Label title="City" text={contact.city} />
                    <List.Item.Detail.Metadata.Label title="State" text={contact.state} />
                    <List.Item.Detail.Metadata.Label title="Zip" text={contact.zip} />
                    <List.Item.Detail.Metadata.Label title="Country" text={contact.country} />
                    <List.Item.Detail.Metadata.Label title="Email" text={contact.email} />
                    <List.Item.Detail.Metadata.Label title="Phone" text={contact.phone} />
                    <List.Item.Detail.Metadata.Label title="Fax" text={contact.fax} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
