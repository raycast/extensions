import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Contact } from "./types";
import { callApi } from "./nicnames";

export default function Contacts() {
  const { isLoading, data: contacts } = useCachedPromise(
    async () => {
      const result = await callApi<{ list: Contact[] }>("contact");
      return result.list;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {contacts.map((contact) => (
        <List.Item
          key={contact.contactId}
          icon={Icon.Person}
          title={[contact.firstName, contact.middleName, contact.lastName].join(" ")}
          subtitle={contact.email}
        />
      ))}
    </List>
  );
}
