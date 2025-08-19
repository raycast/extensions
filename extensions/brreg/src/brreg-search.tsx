import { List, ActionPanel, Action } from "@raycast/api";
import CompanyDetailsView from "./components/CompanyDetailsView";
import FavoritesList from "./components/FavoritesList";
import SearchResults from "./components/SearchResults";
import SettingsView from "./components/SettingsView";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import { useFavorites } from "./hooks/useFavorites";
import { useSearch } from "./hooks/useSearch";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useCompanyView } from "./hooks/useCompanyView";
import { useSettings } from "./hooks/useSettings";
import { useState, useEffect } from "react";
import { Enhet } from "./types";

export default function SearchAndCopyCommand() {
  const [selectedEntity, setSelectedEntity] = useState<Enhet | null>(null);

  const favoritesResult = useFavorites();
  const searchResult = useSearch();
  const keyboardResult = useKeyboardShortcuts();
  const companyViewResult = useCompanyView();
  const settingsResult = useSettings();

  // Guard against undefined hook results
  if (!favoritesResult || !searchResult || !keyboardResult || !companyViewResult || !settingsResult) {
    return (
      <List isLoading={true}>
        <List.Section title="Loading">
          <List.Item title="Initializing..." subtitle="Please wait..." />
        </List.Section>
      </List>
    );
  }

  // Now safe to destructure all hooks
  const { entities, isLoading, setSearchText } = searchResult;
  const { showMoveIndicators: keyboardMoveIndicators, handleCopyOrgNumber } = keyboardResult;
  const { currentCompany, isLoadingDetails, isCompanyViewOpen, handleViewDetails, closeCompanyView } =
    companyViewResult;

  const { settings } = settingsResult;

  // Now safe to destructure
  const {
    favorites,
    favoriteIds,
    favoriteById,
    isLoadingFavorites,
    addFavorite,
    removeFavorite,
    updateFavoriteEmoji,
    resetFavoriteToFavicon,
    refreshFavoriteFavicon,
    moveFavoriteUp,
    moveFavoriteDown,
    toggleMoveMode,
  } = favoritesResult;

  // Use the keyboard shortcuts from the hook
  const showMoveIndicators = keyboardMoveIndicators;

  // Handle copy organization number keyboard shortcut
  useEffect(() => {
    const handleCopyEvent = () => {
      if (selectedEntity) {
        handleCopyOrgNumber(selectedEntity.organisasjonsnummer);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("copyOrgNumber", handleCopyEvent);
      return () => window.removeEventListener("copyOrgNumber", handleCopyEvent);
    }
  }, [selectedEntity, handleCopyOrgNumber]);

  if (isCompanyViewOpen) {
    return <CompanyDetailsView company={currentCompany!} isLoading={isLoadingDetails} onBack={closeCompanyView} />;
  }

  return (
    <List
      isLoading={isLoading || isLoadingFavorites}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder={
        showMoveIndicators
          ? "Move Mode Active - Use ⌘⇧↑↓ to reorder favorites"
          : "Search for name or organisation number"
      }
      onSelectionChange={(id) => {
        // Find the selected entity from either favorites or search results
        const entity = [...favorites, ...entities].find((e) => e.organisasjonsnummer === id);
        setSelectedEntity(entity || null);
      }}
    >
      <FavoritesList
        favorites={favorites}
        showMoveIndicators={showMoveIndicators}
        onViewDetails={handleViewDetails}
        onRemoveFavorite={removeFavorite}
        onUpdateEmoji={updateFavoriteEmoji}
        onResetToFavicon={resetFavoriteToFavicon}
        onRefreshFavicon={refreshFavoriteFavicon}
        onMoveUp={moveFavoriteUp}
        onMoveDown={moveFavoriteDown}
        onToggleMoveMode={toggleMoveMode}
      />

      <SearchResults
        entities={entities}
        favoriteIds={favoriteIds as Set<string>}
        favoriteById={favoriteById}
        onViewDetails={handleViewDetails}
        onAddFavorite={addFavorite}
        onRemoveFavorite={removeFavorite}
        onUpdateEmoji={updateFavoriteEmoji}
        onResetToFavicon={resetFavoriteToFavicon}
        onRefreshFavicon={refreshFavoriteFavicon}
      />

      {/* Show welcome message when no favorites and no search results */}
      {settings.showWelcomeMessage &&
        favorites.length === 0 &&
        entities.length === 0 &&
        !isLoading &&
        !isLoadingFavorites && (
          <List.Section title="Getting Started">
            <List.Item
              title="Welcome to Brreg Search!"
              subtitle="Your gateway to Norwegian business information"
              icon="🇳🇴"
              accessories={[
                { text: "Search for companies above" },
                { text: "Add favorites with ⌘F" },
                { text: "Organize with custom emojis" },
                { text: "Reorder favorites with ⌘⇧↑↓" },
                { text: "Copy org number with ⌘O" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="Open Settings" target={<SettingsView />} />
                  <Action.Push title="Keyboard Shortcuts" target={<KeyboardShortcutsHelp />} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Quick Tips"
              subtitle="Make the most of your search experience"
              icon="💡"
              accessories={[
                { text: "Search by company name" },
                { text: "Or organization number" },
                { text: "View detailed company info" },
                { text: "Copy addresses and details" },
              ]}
            />
          </List.Section>
        )}
    </List>
  );
}
