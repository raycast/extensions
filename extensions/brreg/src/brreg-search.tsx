import { List, ActionPanel, Action } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import CompanyDetailsView from "./components/CompanyDetailsView";
import FavoritesList from "./components/FavoritesList";
import SearchResults from "./components/SearchResults";
import WelcomeView from "./components/WelcomeView";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import { useFavorites } from "./hooks/useFavorites";
import { useSearch } from "./hooks/useSearch";
import { useCompanyView } from "./hooks/useCompanyView";
import { useSettings } from "./hooks/useSettings";
import { UI_TEXT } from "./constants";

export default function SearchAndCopyCommand() {
  const favoritesResult = useFavorites();
  const searchResult = useSearch();
  const companyViewResult = useCompanyView();
  const settingsResult = useSettings();

  const { entities, isLoading, setSearchText, trimmed } = searchResult;
  const { currentCompany, isLoadingDetails, isCompanyViewOpen, handleViewDetails, closeCompanyView } =
    companyViewResult;

  const { settings } = settingsResult;

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

  if (isCompanyViewOpen && currentCompany) {
    const orgNumber = currentCompany.organizationNumber;
    const isFav = favoriteIds.has(orgNumber);
    const toEnhet = () => ({
      organisasjonsnummer: currentCompany.organizationNumber,
      navn: currentCompany.name,
      forretningsadresse: currentCompany.address
        ? { adresse: [currentCompany.address], postnummer: currentCompany.postalCode, poststed: currentCompany.city }
        : undefined,
      website: currentCompany.website,
      faviconUrl: currentCompany.website ? getFavicon(currentCompany.website) : undefined,
    });

    return (
      <CompanyDetailsView
        company={currentCompany}
        isLoading={isLoadingDetails}
        onBack={closeCompanyView}
        isFavorite={isFav}
        onAddFavorite={() => addFavorite(toEnhet())}
        onRemoveFavorite={() => removeFavorite(toEnhet())}
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
          onViewDetails={handleViewDetails}
          onAddFavorite={addFavorite}
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
                </ActionPanel>
              }
            />
          </List.Section>
        )}
    </List>
  );
}
