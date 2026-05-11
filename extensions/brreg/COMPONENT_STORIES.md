# Component Stories - Brreg Search Extension

This document provides detailed examples and usage patterns for each component in the system.

## 🎭 EntityActions Component

### Story: Basic Entity Actions
```tsx
import EntityActions from './components/EntityActions';

<EntityActions
  entity={{
    organisasjonsnummer: "123456789",
    navn: "Example Company AS",
    forretningsadresse: { adresse: ["Street 1"], postnummer: "0001", poststed: "Oslo" }
  }}
  addressString="Street 1, 0001 Oslo"
  onViewDetails={(entity) => console.log('View details for:', entity.navn)}
  onCopyOrgNumber={(orgNumber) => console.log('Copied:', orgNumber)}
  onCopyAddress={(address) => console.log('Copied address:', address)}
  onOpenInBrowser={(url) => console.log('Opening:', url)}
/>
```

### Story: Entity Without Address
```tsx
<EntityActions
  entity={entity}
  onViewDetails={handleViewDetails}
  onCopyOrgNumber={handleCopyOrgNumber}
  onCopyAddress={handleCopyAddress}
  onOpenInBrowser={handleOpenInBrowser}
/>
```

**Key Features:**
- Always shows View Details, Copy Org Number, and Open in Browser
- Conditionally shows Copy Address if addressString is provided
- Generates Brønnøysundregistrene URL automatically

## 🏆 FavoriteActions Component

### Story: Favorite with Move Mode Active
```tsx
import FavoriteActions from './components/FavoriteActions';

<FavoriteActions
  entity={favoriteEntity}
  index={2}
  showMoveIndicators={true}
  onRemoveFavorite={handleRemoveFavorite}
  onUpdateEmoji={handleUpdateEmoji}
  onResetToFavicon={handleResetToFavicon}
  onRefreshFavicon={handleRefreshFavicon}
  onMoveUp={handleMoveUp}
  onMoveDown={handleMoveDown}
  onToggleMoveMode={handleToggleMoveMode}
/>
```

### Story: First Favorite (with Move Mode Toggle)
```tsx
<FavoriteActions
  entity={firstFavorite}
  index={0}
  showMoveIndicators={false}
  // ... other props
/>
```

**Key Features:**
- Shows emoji management actions (EmojiActionMenu)
- Provides reordering actions (Move Up/Down)
- Shows Remove from Favorites action
- Only first favorite (index === 0) shows Move Mode toggle
- All actions have appropriate keyboard shortcuts

## 🔍 SearchResultActions Component

### Story: Adding New Entity to Favorites
```tsx
import SearchResultActions from './components/SearchResultActions';

<SearchResultActions
  entity={searchResult}
  isFavorite={false}
  onAddFavorite={handleAddFavorite}
  onRemoveFavorite={handleRemoveFavorite}
  onUpdateEmoji={handleUpdateEmoji}
  onResetToFavicon={handleResetToFavicon}
  onRefreshFavicon={handleRefreshFavicon}
/>
```

### Story: Managing Existing Favorite
```tsx
<SearchResultActions
  entity={searchResult}
  isFavorite={true}
  favoriteEntity={existingFavorite}
  // ... other props
/>
```

**Key Features:**
- Conditionally renders based on favorite status
- Shows "Add to Favorites" for new entities
- Shows "Remove from Favorites" + emoji actions for existing favorites
- Integrates with EmojiActionMenu for comprehensive emoji management

## 🎨 EmojiActionMenu Component

### Story: Setting Custom Emoji
```tsx
import EmojiActionMenu from './components/EmojiActionMenu';

<EmojiActionMenu
  entity={entity}
  currentEmoji="⭐"
  onUpdateEmoji={(entity, emoji) => setEmoji(entity, emoji)}
  onResetToFavicon={(entity) => resetEmoji(entity)}
  onRefreshFavicon={(entity) => refreshFavicon(entity)}
/>
```

**Key Features:**
- Predefined emoji categories (Star, Bank, Growth, etc.)
- Clear Emoji option to reset to favicon
- Custom Emoji input via EmojiForm
- Reset to Favicon and Refresh Favicon actions

## 📋 FavoritesList Component

### Story: Empty Favorites State
```tsx
import FavoritesList from './components/FavoritesList';

<FavoritesList
  favorites={[]}
  showMoveIndicators={false}
  onViewDetails={handleViewDetails}
  onRemoveFavorite={handleRemoveFavorite}
  onUpdateEmoji={handleUpdateEmoji}
  onResetToFavicon={handleResetToFavicon}
  onRefreshFavicon={handleRefreshFavicon}
  onMoveUp={handleMoveUp}
  onMoveDown={handleMoveDown}
  onToggleMoveMode={handleToggleMoveMode}
/>
// Renders nothing (null) when no favorites
```

### Story: Favorites with Move Indicators
```tsx
<FavoritesList
  favorites={favoritesArray}
  showMoveIndicators={true}
  // ... other props
/>
// Shows move indicators (↑↓) on each favorite item
```

**Key Features:**
- Conditionally renders based on favorites array length
- Shows move indicators when showMoveIndicators is true
- Each favorite item shows address and move capabilities
- Integrates EntityActions and FavoriteActions

## 🔎 SearchResults Component

### Story: Search Results with Mixed Favorite Status
```tsx
import SearchResults from './components/SearchResults';

<SearchResults
  entities={searchResults}
  favoriteIds={new Set(["123456789", "987654321"])}
  favoriteById={favoritesMap}
  onViewDetails={handleViewDetails}
  onAddFavorite={handleAddFavorite}
  onRemoveFavorite={handleRemoveFavorite}
  onUpdateEmoji={handleUpdateEmoji}
  onResetToFavicon={handleResetToFavicon}
  onRefreshFavicon={handleRefreshFavicon}
/>
```

**Key Features:**
- Shows entity icon (emoji or favicon) for favorites
- Integrates EntityActions for common actions
- Uses SearchResultActions for favorite management
- Handles both favorite and non-favorite entities

## 🛡️ ErrorBoundary Component

### Story: Catching Component Errors
```tsx
import ErrorBoundary from './components/ErrorBoundary';

<ErrorBoundary fallback={<CustomErrorComponent />}>
  <ComponentThatMightError />
</ErrorBoundary>
```

### Story: Default Error Display
```tsx
<ErrorBoundary>
  <ComponentThatMightError />
</ErrorBoundary>
// Shows default error UI with reload option
```

**Key Features:**
- Catches React component errors
- Provides customizable fallback UI
- Shows error details and reload option
- Graceful degradation for better UX

## 🪝 Hook Usage Stories

### useFavorites Hook
```tsx
import { useFavorites } from './hooks/useFavorites';

function MyComponent() {
  const {
    favorites,
    favoriteIds,
    favoriteById,
    isLoadingFavorites,
    addFavorite,
    removeFavorite,
    updateFavoriteEmoji,
    moveFavoriteUp,
    moveFavoriteDown,
    toggleMoveMode,
  } = useFavorites();

  // Use the favorites data and actions
}
```

### useSearch Hook
```tsx
import { useSearch } from './hooks/useSearch';

function SearchComponent() {
  const {
    searchText,
    entities,
    isLoading,
    setSearchText,
  } = useSearch();

  // Handle search functionality
}
```

### useKeyboardShortcuts Hook
```tsx
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function KeyboardAwareComponent() {
  const { showMoveIndicators } = useKeyboardShortcuts();

  // React to keyboard state changes
}
```

## 🔧 Utility Function Stories

### Entity Utilities
```tsx
import { 
  getEntityIcon, 
  isFavorite, 
  getFavoriteEntity,
  getBregUrl,
  canMoveUp,
  canMoveDown 
} from './utils/entity';

// Get entity display icon
const icon = getEntityIcon(entity); // Returns emoji or favicon

// Check favorite status
const isFav = isFavorite(entity, favoriteIds);

// Get favorite data
const favData = getFavoriteEntity(entity, favoriteById);

// Generate URL
const url = getBregUrl("123456789");

// Check move capabilities
const canMoveUpFlag = canMoveUp(2); // false for index 0
const canMoveDownFlag = canMoveDown(2, 5); // true if not last
```

## 📊 Performance Monitoring

### usePerformanceMonitor Hook
```tsx
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';

function OptimizedComponent() {
  const { getMetrics, isPerformanceDegrading } = usePerformanceMonitor('OptimizedComponent');

  useEffect(() => {
    if (isPerformanceDegrading()) {
      console.warn('Performance is degrading, consider optimization');
    }
  });

  // Component logic
}
```

## 🎯 Integration Patterns

### Complete Action Panel Structure
```tsx
<ActionPanel>
  {/* Common actions for all entities */}
  <EntityActions
    entity={entity}
    addressString={addressString}
    onViewDetails={handleViewDetails}
    onCopyOrgNumber={handleCopyOrgNumber}
    onCopyAddress={handleCopyAddress}
    onOpenInBrowser={handleOpenInBrowser}
  />
  
  {/* Entity-specific actions */}
  {isFavorite ? (
    <FavoriteActions
      entity={entity}
      index={index}
      showMoveIndicators={showMoveIndicators}
      // ... favorite-specific props
    />
  ) : (
    <SearchResultActions
      entity={entity}
      isFavorite={false}
      // ... search result props
    />
  )}
</ActionPanel>
```

### Component Composition Pattern
```tsx
// Main component orchestrates hooks and components
function MainComponent() {
  const favorites = useFavorites();
  const search = useSearch();
  const keyboard = useKeyboardShortcuts();
  const companyView = useCompanyView();

  return (
    <List>
      <FavoritesList {...favorites} />
      <SearchResults {...search} />
    </List>
  );
}
```

---

These stories demonstrate the flexibility and composability of our component system. Each component has a clear responsibility and can be easily combined to create complex UIs while maintaining clean, maintainable code.
