# Developer Guide - Brreg Search Extension

## 🏗️ Architecture Overview

This extension has been refactored using modern React patterns and best practices. The codebase follows a clean, modular architecture with clear separation of concerns.

### Project Structure
```
src/
├── components/           # React components
│   ├── EntityActions.tsx        # Common entity actions
│   ├── FavoriteActions.tsx      # Favorite-specific actions
│   ├── SearchResultActions.tsx  # Search result actions
│   ├── FavoritesList.tsx        # Favorites display
│   ├── SearchResults.tsx        # Search results display
│   ├── EmojiActionMenu.tsx      # Emoji management
│   ├── CompanyDetailsView.tsx   # Company details
│   ├── EmojiForm.tsx            # Custom emoji input
│   └── ErrorBoundary.tsx        # Error handling
├── hooks/               # Custom React hooks
│   ├── useFavorites.ts          # Favorites management
│   ├── useSearch.ts             # Search functionality
│   ├── useKeyboardShortcuts.ts  # Keyboard event handling
│   ├── useCompanyView.ts        # Company view state
│   ├── useEntityActions.ts      # Action utilities
│   └── useMemoizedActions.ts    # Performance optimizations
├── utils/               # Utility functions
│   ├── format.ts                # Formatting utilities
│   └── entity.ts                # Entity operations
├── constants/           # Configuration constants
│   └── index.ts                 # All app constants
├── types.ts             # TypeScript type definitions
├── brreg-api.ts         # API integration
└── brreg-search.tsx     # Main component
```

## 🎯 Component Architecture

### Core Components

#### EntityActions
- **Purpose**: Provides common actions for any entity (view, copy, open in browser)
- **Props**: `entity`, `addressString`, and callback functions
- **Usage**: Used in both favorites and search results

#### FavoriteActions
- **Purpose**: Handles favorite-specific actions (emoji, reorder, remove)
- **Props**: `entity`, `index`, `showMoveIndicators`, and callback functions
- **Features**: Emoji management, reordering, move mode toggle

#### SearchResultActions
- **Purpose**: Manages search result actions (add/remove from favorites)
- **Props**: `entity`, `isFavorite`, `favoriteEntity`, and callback functions
- **Features**: Conditional rendering based on favorite status

### Action Panel Structure
```
ActionPanel
├── EntityActions (common actions)
├── FavoriteActions (favorites only)
└── SearchResultActions (search results only)
```

## 🪝 Custom Hooks

### useFavorites
Manages all favorites-related state and operations:
- Local storage management
- Favorites CRUD operations
- Emoji management
- Reordering functionality
- Favicon enrichment

### useSearch
Handles search functionality:
- Search text state
- API calls to Brønnøysundregistrene
- Loading states
- Error handling

### useKeyboardShortcuts
Manages keyboard event handling:
- ⌘⇧ detection for move mode
- Dynamic UI indicators
- Raycast compatibility

### useCompanyView
Manages company detail view state:
- Selected company state
- Loading states
- Navigation handling

## 🔧 Utility Functions

### Entity Utilities (`utils/entity.ts`)
- `getEntityIcon()` - Get display icon for entity
- `isFavorite()` - Check if entity is favorited
- `getFavoriteEntity()` - Get favorite entity data
- `getBregUrl()` - Generate Brønnøysundregistrene URL
- `canMoveUp()` / `canMoveDown()` - Position validation
- `getMoveIndicators()` - Generate move indicators

### Format Utilities (`utils/format.ts`)
- `formatAddress()` - Format business address
- Additional formatting helpers

## 📋 Constants

All configuration values are centralized in `constants/index.ts`:
- **API Configuration**: URLs, endpoints, validation rules
- **Keyboard Shortcuts**: All shortcut definitions
- **Emoji Categories**: Predefined emoji options
- **Storage Keys**: Local storage identifiers
- **UI Text**: All user-facing text
- **Error Messages**: Standardized error messages

## 🚀 Performance Optimizations

### Memoization
- **useMemoizedActions**: Memoized expensive operations
- **useCallback**: Stable function references
- **React.memo**: Component memoization where beneficial

### Efficient Data Structures
- **Set for favorite IDs**: O(1) lookup performance
- **Map for favorite entities**: O(1) access by organization number
- **Memoized derived state**: Avoid unnecessary recalculations

## 🛡️ Error Handling

### ErrorBoundary Component
- Catches React component errors
- Provides user-friendly error messages
- Offers reload functionality
- Graceful degradation

### Toast Notifications
- Success confirmations for user actions
- Error messages for failed operations
- Consistent user feedback

## 🧪 Testing Considerations

### Component Testing
- Each component has a single responsibility
- Props interfaces are well-defined
- Callback functions are properly typed
- Error boundaries provide fallbacks

### Hook Testing
- Hooks are pure and testable
- State management is predictable
- Side effects are isolated

## 🔄 State Management

### Local State
- Component-specific state managed locally
- Form inputs, UI toggles, temporary data

### Global State
- Favorites stored in local storage
- Search state managed at app level
- Company view state for navigation

### State Flow
```
User Action → Hook → State Update → Component Re-render
```

## 📱 Raycast Integration

### API Compatibility
- Uses Raycast's Action components
- Follows Raycast design patterns
- Keyboard shortcut integration
- Toast notifications

### Platform Considerations
- Window event listeners for keyboard shortcuts
- Raycast-specific component usage
- Extension lifecycle management

## 🎨 Styling & UX

### Design Patterns
- Consistent action panel structure
- Clear visual hierarchy
- Intuitive keyboard shortcuts
- Responsive feedback

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Clear action descriptions
- Error state handling

## 🚀 Development Workflow

### Adding New Features
1. **Identify the concern** (UI, logic, data)
2. **Choose the right layer** (component, hook, utility)
3. **Follow existing patterns** (props, callbacks, error handling)
4. **Update constants** if adding new configuration
5. **Add documentation** for new components/hooks

### Modifying Existing Features
1. **Locate the relevant component/hook**
2. **Check for existing patterns** to follow
3. **Update related constants** if needed
4. **Maintain backward compatibility**
5. **Update documentation**

### Code Quality
- **TypeScript**: Strict typing throughout
- **ESLint**: Consistent code style
- **Prettier**: Automatic formatting
- **JSDoc**: Comprehensive documentation

## 🔍 Debugging

### Common Issues
- **State updates**: Check hook dependencies
- **Re-renders**: Verify memoization usage
- **API calls**: Check error boundaries
- **Keyboard events**: Verify Raycast compatibility

### Debug Tools
- React DevTools for component inspection
- Console logging in hooks
- Error boundary fallbacks
- TypeScript compiler errors

## 📚 Additional Resources

- **Raycast API Documentation**: [https://developers.raycast.com/](https://developers.raycast.com/)
- **React Best Practices**: [https://react.dev/learn](https://react.dev/learn)
- **TypeScript Handbook**: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)

---

This architecture provides a solid foundation for future development while maintaining excellent performance and developer experience.
