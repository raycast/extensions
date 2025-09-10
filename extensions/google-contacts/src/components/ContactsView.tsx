import React from "react";
import { List, Toast, showToast, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import * as google from "../api/oauth";
import { fetchContactsInGroup, deleteContact } from "../api/endpoints";
import { Contact, Filter, LocalFavorites } from "../types";
import ContactItem from "./ContactItem";
import CreateContactForm from "./CreateContactForm";
import { getPrimaryName, getPrimaryEmail, getLocalFavorites, toggleLocalFavorite } from "../utils";

type State = {
  filter: Filter;
  isLoading: boolean;
  searchText: string;
  contacts: Contact[];
  localFavorites: LocalFavorites;
};

interface ContactsViewProps {
  filter?: Filter;
  groupId?: string;
  initialContacts?: Contact[];
  isRefreshing?: boolean;
}

export default function ContactsView(props: ContactsViewProps) {
  const [state, setState] = useState<State>({
    filter: props.filter || Filter.All,
    isLoading: !props.initialContacts,
    searchText: "",
    contacts: props.initialContacts || [],
    localFavorites: {},
  });

  // Load local favorites on component mount
  useEffect(() => {
    const loadFavorites = async () => {
      const favorites = await getLocalFavorites();
      setState((prev) => ({
        ...prev,
        localFavorites: favorites,
      }));
    };

    loadFavorites();
  }, []);

  // This effect only runs for group filtering - otherwise we use the cached contacts
  useEffect(() => {
    // Skip fetching if no groupId is specified (we'll use initialContacts in that case)
    if (!props.groupId) {
      return;
    }

    (async () => {
      try {
        setState((previous) => ({ ...previous, isLoading: true }));
        await google.authorize();

        let contactsList: Contact[] = [];

        try {
          // Fetch contacts from a specific group
          // We know groupId exists because of the check above
          contactsList = await fetchContactsInGroup(props.groupId!);
        } catch (fetchError) {
          console.error("Error fetching contacts for group:", fetchError);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load group contacts",
            message: "Could not load contacts for the selected group.",
          });
        }

        setState((previous) => ({
          ...previous,
          contacts: contactsList,
          isLoading: false,
        }));
      } catch (error) {
        console.error(error);
        setState((previous) => ({
          ...previous,
          isLoading: false,
        }));
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, [google, props.groupId]);

  // This effect runs when the initial contacts are updated from the parent
  useEffect(() => {
    if (props.initialContacts && !props.groupId) {
      setState((prev) => ({
        ...prev,
        contacts: props.initialContacts || [],
      }));
    }
  }, [props.initialContacts]);

  // This effect handles search text changes - instant client-side filtering
  useEffect(() => {
    if (!state.searchText || props.groupId) {
      return; // Don't filter if no search text or if in group view
    }

    // Using initial contacts as the base for search (they come from cache)
    const baseContacts = props.initialContacts || [];

    if (baseContacts.length === 0) {
      return; // No contacts to filter
    }

    // Client-side filtering - much faster than API calls
    const searchLower = state.searchText.toLowerCase();
    const filteredContacts = baseContacts.filter((contact) => {
      const name = getPrimaryName(contact).toLowerCase();
      const email = getPrimaryEmail(contact)?.toLowerCase() || "";
      return name.includes(searchLower) || email.includes(searchLower);
    });

    setState((prev) => ({
      ...prev,
      contacts: filteredContacts,
    }));
  }, [state.searchText, props.initialContacts]);

  const handleFavorite = useCallback(
    (contact: Contact) => {
      (async () => {
        try {
          setState((previous) => ({ ...previous, isLoading: true }));

          // Toggle favorite status locally
          const newIsFavorite = await toggleLocalFavorite(contact);

          // Update local favorites state
          setState((previous) => {
            const updatedFavorites = { ...previous.localFavorites };
            updatedFavorites[contact.resourceName] = newIsFavorite;

            return {
              ...previous,
              localFavorites: updatedFavorites,
              isLoading: false,
            };
          });

          showToast({
            style: Toast.Style.Success,
            title: newIsFavorite ? "Added to favorites" : "Removed from favorites",
          });
        } catch (error) {
          console.error(error);
          setState((previous) => ({
            ...previous,
            isLoading: false,
          }));
          showToast({ style: Toast.Style.Failure, title: "Failed to update favorite status" });
        }
      })();
    },
    [setState]
  );

  const handleDelete = useCallback(
    (contact: Contact) => {
      (async () => {
        try {
          setState((previous) => ({ ...previous, isLoading: true }));

          // Store the deleted contact's ID before deletion
          const deletedContactId = contact.resourceName;

          // Delete the contact
          await deleteContact(deletedContactId);

          // Update local state to remove the deleted contact
          setState((previous) => {
            // Filter out the deleted contact
            const updatedContacts = previous.contacts.filter((c) => c.resourceName !== deletedContactId);

            // Also remove from favorites if it's there
            const updatedFavorites = { ...previous.localFavorites };
            if (updatedFavorites[deletedContactId]) {
              delete updatedFavorites[deletedContactId];
            }

            return {
              ...previous,
              contacts: updatedContacts,
              localFavorites: updatedFavorites,
              isLoading: false,
            };
          });

          showToast({ style: Toast.Style.Success, title: "Contact deleted" });
        } catch (error) {
          console.error("Error deleting contact:", error);
          setState((previous) => ({
            ...previous,
            isLoading: false,
          }));
          showToast({ style: Toast.Style.Failure, title: "Failed to delete contact" });
        }
      })();
    },
    [setState]
  );

  const filterContacts = useCallback(() => {
    // First get the initial list based on filter
    let contactList = [...state.contacts];

    // If filter is favorites, only show favorited contacts
    if (state.filter === Filter.Favorites) {
      contactList = contactList.filter((contact) => state.localFavorites[contact.resourceName]);
    }

    // Then sort: favorites first, then alphabetically by name
    contactList.sort((a, b) => {
      // First sort by favorite status (starred contacts first)
      const aFavorite = state.localFavorites[a.resourceName] || false;
      const bFavorite = state.localFavorites[b.resourceName] || false;

      if (aFavorite && !bFavorite) return -1;
      if (!aFavorite && bFavorite) return 1;

      // Then sort alphabetically by name
      const aName = getPrimaryName(a).toLowerCase();
      const bName = getPrimaryName(b).toLowerCase();
      return aName.localeCompare(bName);
    });

    return contactList;
  }, [state.contacts, state.filter, state.localFavorites]);

  return (
    <List
      isShowingDetail
      isLoading={state.isLoading || props.isRefreshing}
      searchText={state.searchText}
      searchBarPlaceholder="Search contacts..."
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
      filtering={false} // We'll handle filtering ourselves via the API
    >
      {filterContacts().map((contact) => {
        return (
          <ContactItem
            key={contact.resourceName}
            contact={contact}
            onToggleFavorite={() => handleFavorite(contact)}
            onDelete={() => handleDelete(contact)}
            localFavorites={state.localFavorites}
          />
        );
      })}

      <List.EmptyView
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.PrimaryText }}
        title="No contacts found"
        description={state.searchText ? "Try a different search term" : "Add a new contact to get started"}
        actions={
          <ActionPanel>
            <Action.Push title="Create Contact" icon={Icon.Plus} target={<CreateContactForm />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
