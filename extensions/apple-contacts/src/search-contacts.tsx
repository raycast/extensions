import { useCallback } from "react";
import { useContacts } from "./hooks";
import ContactList from "./components/ContactList";

export default function SearchContacts() {
  const { data: contacts, isLoading, revalidate } = useContacts();
  const handleRefresh = useCallback(() => revalidate(), [revalidate]);

  return (
    <ContactList
      contacts={contacts ?? []}
      isLoading={isLoading}
      onRefresh={handleRefresh}
    />
  );
}
