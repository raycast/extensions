import { useState, useMemo, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { google } from "./oauth";
import { SortOrder } from "./api";
import { useContacts, useContactGroups } from "./hooks";
import ContactList from "./components/ContactList";
import ContactGrid from "./components/ContactGrid";

export type ViewMode = "list" | "detail" | "grid";
export type SortField = "first" | "last";

function SearchContacts() {
  const { defaultView } = getPreferenceValues<{ defaultView?: ViewMode }>();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView ?? "detail");
  const [sortField, setSortField] = useState<SortField>("first");

  const sortOrder: SortOrder = sortField === "last" ? "LAST_NAME_ASCENDING" : "FIRST_NAME_ASCENDING";
  const { data: contacts, isLoading: contactsLoading, revalidate } = useContacts(sortOrder);
  const { data: groups, isLoading: groupsLoading } = useContactGroups();

  const sortedContacts = useMemo(() => contacts ?? [], [contacts]);

  const handleViewModeChange = useCallback((value: string) => {
    setViewMode(value as ViewMode);
  }, []);

  const handleSortFieldChange = useCallback((value: string) => {
    setSortField(value as SortField);
  }, []);

  const sharedProps = {
    contacts: sortedContacts,
    groups: groups ?? [],
    isLoading: contactsLoading || groupsLoading,
    viewMode,
    sortField,
    onViewModeChange: handleViewModeChange,
    onSortFieldChange: handleSortFieldChange,
    onContactDeleted: revalidate,
    onContactUpdated: revalidate,
    onRefresh: revalidate,
  };

  if (viewMode === "grid") {
    return <ContactGrid {...sharedProps} />;
  }
  return <ContactList {...sharedProps} />;
}

export default withAccessToken(google())(SearchContacts);
