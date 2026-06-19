import { useState, useMemo, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { google } from "./oauth";
import { SortOrder } from "./api";
import { matchesGroup, SortField } from "./helpers";
import { useContacts, useContactGroups } from "./hooks";
import { ViewMode } from "./types";
import ContactList from "./components/ContactList";
import ContactGrid from "./components/ContactGrid";

function SearchContacts() {
  const { defaultView } = getPreferenceValues<Preferences>();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView ?? "detail");
  const [sortField, setSortField] = useState<SortField>("first");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const sortOrder: SortOrder = sortField === "last" ? "LAST_NAME_ASCENDING" : "FIRST_NAME_ASCENDING";
  const { data: contacts, isLoading: contactsLoading, revalidate } = useContacts(sortOrder);
  const { data: groups, isLoading: groupsLoading } = useContactGroups();

  const filteredContacts = useMemo(() => {
    const all = contacts ?? [];
    if (selectedGroup === "all") return all;
    return all.filter((c) => matchesGroup(c, selectedGroup));
  }, [contacts, selectedGroup]);

  const handleViewModeChange = useCallback((value: string) => {
    setViewMode(value as ViewMode);
  }, []);

  const handleSortFieldChange = useCallback((value: string) => {
    setSortField(value as SortField);
  }, []);

  const handleFilterByGroup = useCallback((groupResourceName: string) => {
    setSelectedGroup(groupResourceName);
  }, []);

  const sharedProps = {
    contacts: filteredContacts,
    groups: groups ?? [],
    isLoading: contactsLoading || groupsLoading,
    viewMode,
    sortField,
    selectedGroup,
    onViewModeChange: handleViewModeChange,
    onSortFieldChange: handleSortFieldChange,
    onContactDeleted: revalidate,
    onContactUpdated: revalidate,
    onRefresh: revalidate,
    onFilterByGroup: handleFilterByGroup,
  };

  if (viewMode === "grid") {
    return <ContactGrid {...sharedProps} />;
  }
  return <ContactList {...sharedProps} />;
}

export default withAccessToken(google())(SearchContacts);
