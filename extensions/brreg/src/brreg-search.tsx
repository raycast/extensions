import { List, ActionPanel, Action } from "@raycast/api";
import { useEffect } from "react";
import CompanyDetailsView from "./components/CompanyDetailsView";
import FavoritesList from "./components/FavoritesList";
import SearchResults from "./components/SearchResults";
import WelcomeView from "./components/WelcomeView";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import ChangelogView from "./components/ChangelogView";
import { useFavorites } from "./hooks/useFavorites";
import { useSearch } from "./hooks/useSearch";
import { useCompanyView } from "./hooks/useCompanyView";
import { useSettings } from "./hooks/useSettings";
import { useSearchFavicons } from "./hooks/useSearchFavicons";
import { APP_VERSION, UI_TEXT } from "./constants";
import { useChangelogVersionGate } from "./hooks/useChangelogVersionGate";
import type { Enhet } from "./types";

export default function SearchAndCopyCommand() {
  const favoritesResult = useFavorites();
  const searchResult = useSearch();
  const companyViewResult = useCompanyView();
  const settingsResult = useSettings();
  const changelogGate = useChangelogVersionGate();

  const { entities, isLoading, setSearchText, trimmed } = searchResult;
  const { currentCompany, isLoadingDetails, isCompanyViewOpen, handleViewDetails, closeCompanyView } =
    companyViewResult;

  const { settings } = settingsResult;
  const { shouldShowChangelog } = changelogGate;

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
    showMoveIndicators,
  } = favoritesResult;

  const { getSearchFavicon, upsertFromFavorite, upsertFromDetails } = useSearchFavicons(entities, favoriteById);

  useEffect(() => {
    upsertFromDetails(currentCompany);
  }, [currentCompany, upsertFromDetails]);

  const handleAddFavorite = async (entity: Enhet) => {
    const added = await addFavorite(entity);
    upsertFromFavorite(added ?? entity);
  };

  if (isCompanyViewOpen && currentCompany) {
    const orgNumber = currentCompany.organizationNumber;
    const isFav = favoriteIds.has(orgNumber);
    const toEnhet = () => ({
      organisasjonsnummer: currentCompany.organizationNumber,
      navn: currentCompany.name,
      organisasjonsform:
        currentCompany.organizationFormCode || currentCompany.organizationFormDescription
          ? {
              kode: currentCompany.organizationFormCode,
              beskrivelse: currentCompany.organizationFormDescription,
            }
          : undefined,
      forretningsadresse: currentCompany.address
        ? { adresse: [currentCompany.address], postnummer: currentCompany.postalCode, poststed: currentCompany.city }
        : undefined,
      website: currentCompany.website,
    });
    const currentEntity = toEnhet();

    return (
      <CompanyDetailsView
        company={currentCompany}
        isLoading={isLoadingDetails}
        onBack={closeCompanyView}
        isFavorite={isFav}
        onAddFavorite={() => handleAddFavorite(currentEntity)}
        onRemoveFavorite={() => removeFavorite(currentEntity)}
      />
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingFavorites}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder={showMoveIndicators ? UI_TEXT.MOVE_MODE_ACTIVE : UI_TEXT.SEARCH_PLACEHOLDER}
    >
      {shouldShowChangelog && trimmed.length === 0 && !isLoading && !isLoadingFavorites && (
        <List.Section title={`What's New in ${APP_VERSION}`}>
          <List.Item
            title={`Updated to version ${APP_VERSION}`}
            subtitle="Review key release highlights"
            icon="🆕"
            actions={
              <ActionPanel>
                <Action.Push title="Open Changelog" target={<ChangelogView />} />
                <Action.Push title="Keyboard Shortcuts" target={<KeyboardShortcutsHelp />} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {trimmed.length === 0 && (
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
      )}

      {trimmed.length > 0 && (
        <SearchResults
          entities={entities}
          favoriteIds={favoriteIds}
          favoriteById={favoriteById}
          getSearchFavicon={getSearchFavicon}
          onViewDetails={handleViewDetails}
          onAddFavorite={handleAddFavorite}
          onRemoveFavorite={removeFavorite}
          onUpdateEmoji={updateFavoriteEmoji}
          onResetToFavicon={resetFavoriteToFavicon}
          onRefreshFavicon={refreshFavoriteFavicon}
        />
      )}

      {/* Show welcome message when no favorites and no search results */}
      {settings.showWelcomeMessage &&
        trimmed.length === 0 &&
        favorites.length === 0 &&
        entities.length === 0 &&
        !isLoading &&
        !isLoadingFavorites && (
          <List.Section title="Welcome to Brreg Search">
            <List.Item
              title="Get started"
              subtitle="Your gateway to Norwegian business information"
              icon="🇳🇴"
              actions={
                <ActionPanel>
                  <Action.Push title="Open" target={<WelcomeView />} />
                  <Action.Push title="Changelog" target={<ChangelogView />} />
                  <Action.Push title="Keyboard Shortcuts" target={<KeyboardShortcutsHelp />} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Keyboard Shortcuts"
              subtitle="See all keyboard shortcuts"
              icon="🔑"
              actions={
                <ActionPanel>
                  <Action.Push title="Open" target={<KeyboardShortcutsHelp />} />
                  <Action.Push title="Changelog" target={<ChangelogView />} />
                </ActionPanel>
              }
            />
          </List.Section>
        )}
    </List>
  );
}
