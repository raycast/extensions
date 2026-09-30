import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listContacts } from "./nicnames";

export default function Contacts() {
  const { isLoading, data: contacts } = useCachedPromise(
    async () => {
      const result = await listContacts();
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
          title={[contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(" ")}
          subtitle={contact.email}
        />
      ))}
    </List>
  );
}
