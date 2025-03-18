import React from "react";
import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { Contact, Filter } from "../types";
import CreateContactForm from "./CreateContactForm";

interface EmptyViewProps {
  contacts: Contact[];
  filter: Filter;
  searchText: string;
}

export default function EmptyView(props: EmptyViewProps) {
  const { contacts, filter, searchText } = props;

  if (contacts.length === 0) {
    let title = "No contacts";
    let description = "Create a new contact to get started";
    let icon = { source: Icon.Person, tintColor: Color.PrimaryText };

    if (searchText) {
      title = "No matching contacts";
      description = "Try a different search term";
      icon = { source: Icon.MagnifyingGlass, tintColor: Color.PrimaryText };
    } else if (filter === Filter.Favorites) {
      title = "No favorite contacts";
      description = "Mark contacts as favorites to see them here";
      icon = { source: Icon.Star, tintColor: Color.Yellow };
    }

    return (
      <List.EmptyView
        icon={icon}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            <Action.Push title="Create Contact" icon={Icon.Plus} target={<CreateContactForm />} />
          </ActionPanel>
        }
      />
    );
  }

  return null;
}
