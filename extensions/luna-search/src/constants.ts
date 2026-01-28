/**
 * How many menu items each secion of the nav-menu can hold.
 */
export const MENU_SECTION_CAPACITY = 5;

/**
 * The minimum length for a search to produce reasonable results. Protects the API from low quality traffic.
 */
export const MIN_SEARCH_LENGTH = 3;

/**
 * Defines the display values used throughout the application.
 * These values include strings for UI elements, colors, and
 * other constants that affect the visual representation of
 * the application.
 */
export const DISPLAY_VALUES = {
  copyTitle: "Copy Game URL",
  defaultDescription: 'Try something like "adventure"',
  defaultTitle: "Start typing to search",
  developersTitle: "Developers",
  emptyDescription: "Try a different search",
  emptyTitle: "No results found",
  errorMessage: "Something went wrong!",
  gameModesTitle: "Game Modes",
  launchGame: "Launch Game",
  loadingDescription: "(so many games)",
  loadingTitle: "Seaching",
  menu_recents_title: "Recents",
  menu_tooltip: "Luna Quick Access",
  menu_top_title: `Top ${MENU_SECTION_CAPACITY} Trending`,
  metadataGenreTitle: "Genres",
  metadataRatingTitle: "Rating",
  metadataRatingContentTitle: "", // Intentionally blank for appearance
  openTitle: "See in Luna",
  publishersTitle: "Publishers",
  releaseDateTitle: "Released",
  searchPlaceholder: "Search for a game on Amazon Luna",
  searchTitle: "Search Amazon Luna",
  seeDetailsTitle: "See Details",
  seeTrendingTitle: "See Trending Games",
  tooFewCharsSearchDescription: `Searches require at least ${MIN_SEARCH_LENGTH} letters.`,
  tooFewCharsSearchTitle: "Keep typing",
  trendingPrefix: "Top Games: ",
};
/**
 * The path for the Luna logo image used in the application.
 */
export const LUNA_LOGO_IMG = "logo_luna.png";

/**
 * The base URL for the Luna API endpoint.
 */
export const LUNA_API_ROUTE = "https://proxy-prod.us-east-1.tempo.digital.a2z.com/getPage";
