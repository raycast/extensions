# Raycast AI Models

A Raycast extension that allows you to browse, compare, and explore available AI models with detailed sorting and filtering capabilities.

## Features

- 📋 **Browse AI Models**: View all available Raycast AI models in a clean list interface
- 🔍 **Advanced Sorting**: Sort models by intelligence, speed, or combined metrics
- ⚡ **Smart Caching**: Fast loading with intelligent caching and background revalidation
- 📊 **Model Details**: View detailed information about each model including capabilities and provider info
- 🔄 **Manual Refresh**: Force refresh to get the latest model data

## Commands

### Browse Models

Browse and compare Raycast AI models by intelligence and speed. The command provides multiple sorting options:

- **Intelligence**: Sort by model intelligence score (higher = more intelligent)
- **Speed**: Sort by model speed score (lower = faster)
- **Intelligence → Speed**: Sort by intelligence first, then use speed as tiebreaker
- **Speed → Intelligence**: Sort by speed first, then use intelligence as tiebreaker
- **Combined**: Weighted combination of intelligence (60%) and speed (40%)

Each sort option supports both ascending and descending order.

## Code Structure

### `src/list-models.tsx`

The main UI component that renders the model list. Key features:

- **State Management**: Manages loading, error, and sorting states
- **Optimized Rendering**: Uses `useMemo` to prevent unnecessary re-renders
- **Favicon Caching**: Caches provider favicons for better performance
- **Stale-While-Revalidate**: Shows cached data immediately while fetching fresh data in the background
- **Sort Configuration**: Dropdown to switch between 10 different sorting strategies
- **Action Panel**: 
  - View detailed model information
  - Copy model ID to clipboard
  - Manual refresh option

### `src/api.ts`

The data layer that handles fetching and caching of model data. Key features:

- **Type Definitions**: Comprehensive TypeScript types for models, abilities, and capabilities
- **Multi-Level Caching**: 
  - In-memory cache for instant access
  - localStorage for persistence across sessions
  - 5-minute TTL (Time To Live)
- **Fetch Function**: `fetchModels()` with force refresh option
- **Sorting Algorithms**: Six different sorting strategies:
  - `intelligence`: Sort by intelligence score
  - `speed`: Sort by speed score
  - `name`: Alphabetical sorting
  - `intelligence_then_speed`: Primary by intelligence, secondary by speed
  - `speed_then_intelligence`: Primary by speed, secondary by intelligence
  - `combined`: Normalized weighted combination (60% intelligence, 40% inverted speed)
- **Normalization**: Min-max normalization for combined scoring
- **Cache Management**: Functions to save/load from storage and clear cache

## Data Flow

1. Component mounts → Loads cached data immediately (if available)
2. Background fetch starts after 100ms delay
3. Fresh data updates the UI when received
4. User interactions trigger sorting without re-fetching
5. Manual refresh forces a new fetch bypassing cache

## Model Data Structure

Each model contains:
- **id**: Unique identifier
- **name**: Display name
- **description**: Model description
- **provider**: Provider company (e.g., "openai", "anthropic")
- **provider_name**: Human-readable provider name
- **intelligence**: Intelligence score (higher is better)
- **speed**: Speed score (lower is faster)
- **abilities**: Supported features (web_search, vision, tools, etc.)
- **capabilities**: Additional model capabilities
- **context**: Context window size
- **availability**: Public or private access

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Lint and fix code
npm run fix-lint
```

## API Endpoint

The extension fetches model data from:
```
https://www.raycast.com/api/web-ai/models
```

## Performance Optimizations

1. **Stale-While-Revalidate**: Shows cached data instantly while updating in background
2. **Memoization**: Prevents unnecessary re-computations of sorted data and favicon URLs
3. **Lazy Background Refresh**: Delays fresh data fetch by 100ms to prioritize UI rendering
4. **Efficient Sorting**: Pre-computed weight maps for O(1) lookups in combined sorting
5. **localStorage Persistence**: Survives page refreshes and app restarts

## License

MIT
