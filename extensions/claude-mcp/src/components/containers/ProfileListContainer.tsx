/**
 * Profile list container component following Single Responsibility Principle
 * Handles business logic and state management, delegates rendering to view component
 */

import React from "react";
import { open, environment } from "@raycast/api";
import { ProfileListView } from "../ui/ProfileListView";
import { useProfileList, useProfileFilter, useProfileSort } from "../../hooks/useProfileList";
import { ServiceProvider } from "../../context/ServiceProvider";

function ProfileListContent() {
  const { profiles, isLoading, error, loadProfiles, refreshProfiles, clearError } = useProfileList();

  const { searchQuery, setSearchQuery, filteredProfiles } = useProfileFilter(profiles);
  const { sortBy, sortOrder, sortedProfiles, toggleSort } = useProfileSort(filteredProfiles);

  const handleCreateProfile = async () => {
    // Open create profile command using dynamic extension info
    await open(`raycast://extensions/${environment.extensionName}/create-profile`);
  };

  const handleRetry = () => {
    clearError();
    loadProfiles();
  };

  return (
    <ProfileListView
      profiles={sortedProfiles}
      isLoading={isLoading}
      error={error}
      searchQuery={searchQuery}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSearchQueryChange={setSearchQuery}
      onSortToggle={toggleSort}
      onCreateProfile={handleCreateProfile}
      onRefresh={refreshProfiles}
      onRetry={handleRetry}
    />
  );
}

export default function ProfileListContainer() {
  return (
    <ServiceProvider>
      <ProfileListContent />
    </ServiceProvider>
  );
}
