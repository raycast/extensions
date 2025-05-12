import React, { useState, useEffect } from "react";
import { List } from "@raycast/api";
import { Contact, Field } from "./types/dovetail";
import { getContactDetails } from "./api/client";
import { useAuth } from "./hooks/useAuth";
import { format } from "date-fns";
import { getAvatarIcon } from "@raycast/utils";
import { useSearch } from "./hooks/useSearch";
import { getContacts } from "./api/client";

function useContactDetail(contactId: string | null) {
  const { token } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    getContactDetails(contactId, token).then((data) => {
      setContact(data as Contact);
      setLoading(false);
    });
  }, [contactId, token]);

  return { contact, loading };
}

function getFieldValue(fields: Field[], label: string): string | undefined {
  const field = fields.find((f) => f.label?.toLowerCase() === label.toLowerCase());
  if (!field) return undefined;
  if (Array.isArray(field.value)) return field.value.join(", ");
  return field.value ?? undefined;
}

const TAG_COLORS = ["#4F8FFF", "#FFD700", "#FF69B4", "#00C49A", "#FF7043", "#A259FF", "#FFB300", "#00B8D9"];

export default function SearchContacts() {
  const { data, isLoading, numberOfResults } = useSearch<Contact>(getContacts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>(data);
  const { contact, loading } = useContactDetail(selectedId);

  useEffect(() => {
    setFilteredContacts(
      data.filter((contact) => (contact.name || "").toLowerCase().includes(searchText.toLowerCase())),
    );
  }, [searchText, data]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarPlaceholder="Search contacts by name..."
      selectedItemId={selectedId || undefined}
      onSelectionChange={setSelectedId}
    >
      <List.Section title="Contacts" subtitle={numberOfResults}>
        {filteredContacts.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            title={item.name || "Untitled contact"}
            icon={getAvatarIcon(item.name || "")}
            detail={
              item.id === selectedId ? (
                <List.Item.Detail
                  isLoading={loading}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={contact?.name || "Untitled contact"} />
                      <List.Item.Detail.Metadata.Label
                        title="Email"
                        text={Array.isArray(contact?.fields) ? getFieldValue(contact.fields, "Email") || "" : ""}
                      />
                      {contact?.created_at && (
                        <List.Item.Detail.Metadata.Label
                          title="Created"
                          text={format(new Date(contact.created_at), "d MMMM yyyy")}
                        />
                      )}
                      {Array.isArray(contact?.fields) && contact.fields.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          {contact.fields.map((field: Field, idx: number) => {
                            if (!field.label || field.label.toLowerCase() === "email") return null;
                            if (Array.isArray(field.value)) {
                              return (
                                <List.Item.Detail.Metadata.TagList key={idx} title={field.label}>
                                  {field.value.map((tag: string, tagIdx: number) => (
                                    <List.Item.Detail.Metadata.TagList.Item
                                      key={tagIdx}
                                      text={tag}
                                      color={TAG_COLORS[idx % TAG_COLORS.length]}
                                    />
                                  ))}
                                </List.Item.Detail.Metadata.TagList>
                              );
                            }
                            return (
                              <List.Item.Detail.Metadata.Label
                                key={idx}
                                title={field.label}
                                text={field.value == null ? "" : String(field.value)}
                              />
                            );
                          })}
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : undefined
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
