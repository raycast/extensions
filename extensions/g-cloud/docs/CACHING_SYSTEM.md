# Caching System

The G-Cloud application implements a robust caching system to improve performance and user experience. This document explains how the caching system works and how to use it effectively.

## Overview

The caching system has several components:

1. **Project Caching**: Remembers recently used projects for quick access
2. **Authentication Caching**: Stores authentication status to reduce login frequency
3. **API Response Caching**: Reduces redundant API calls to Google Cloud
4. **Command Caching**: Caches executed gcloud commands for better performance

## Project Caching

### How It Works

The project caching system maintains a list of recently used projects based on user configuration. When a user selects a project, it is automatically added to the cached projects list and displayed in the CachedProjectView.

### Key Features

- **Configurable Cache Limit**: Users can set how many projects to cache (1-3)
- **Automatic Management**: Projects are automatically added to cache when selected
- **Persistence**: Cached projects persist for the configured duration
- **"Last Used" Tracking**: Projects are displayed with "Last used," "Previously used," or "Used earlier" indicators

### Implementation

The project caching system is implemented in `CacheManager.ts` and provides:

- `saveSelectedProject(projectId)`: Saves a project as the selected project and updates the recently used list
- `getSelectedProject()`: Retrieves the currently selected project
- `getRecentlyUsedProjects()`: Returns the list of recently used project IDs
- `getRecentlyUsedProjectsWithDetails()`: Returns the list of recently used projects with full details
- `syncRecentlyUsedProjectsWithCacheLimit()`: Ensures the recently used list respects the configured limit

### Configuration

Users can configure the caching system directly from the CachedProjectView:

1. **Cache Limit**: Set to 1, 2, or 3 projects (default: 1)
2. **Cache Duration**: Aligns with the auth cache duration (default: 72 hours)

### Implementation Details

Projects are stored in three locations for maximum reliability:

1. **In-Memory Cache**: For the fastest access during the current session
2. **Raycast Cache**: Persists between sessions using the Raycast API
3. **Preferences File**: Ensures persistence even if the Raycast cache is cleared

## Authentication Caching

Authentication status is cached to reduce the need for frequent logins:

- **Configurable Duration**: Users can set the auth cache duration to 1, 12, 24, or 72 hours
- **User Info Storage**: Caches both auth status and the authenticated user's email
- **Grace Period**: Provides a grace period before requiring re-authentication

## Command Caching

The gcloud command execution system uses caching to improve performance:

- **Result Caching**: Caches command results to avoid redundant API calls
- **Automatic Invalidation**: Cache is invalidated when dependencies change
- **Deduplication**: Prevents duplicate in-flight requests for the same command
- **Retry Mechanism**: Implements exponential backoff for failed commands

## Best Practices

When working with the caching system:

1. **Use CacheManager Methods**: Always use the CacheManager utility methods rather than accessing the cache directly
2. **Handle Cache Misses**: Always implement fallbacks for when cached data is not available
3. **Respect Cache TTL**: Check cache timestamps to ensure data is not stale
4. **Validate Cached Data**: Ensure cached data is valid before using it
5. **Clear Caches Appropriately**: Use the clear cache methods when data becomes invalid

## Example: Using the Project Caching System

```typescript
// Get the current cache limit
const cacheLimit = CacheManager.getCacheLimit();

// Ensure recently used projects respect the cache limit
CacheManager.syncRecentlyUsedProjectsWithCacheLimit();

// Get cached project
const cached = CacheManager.getSelectedProject();

// Get the recently used projects with details
const recentProjects = await CacheManager.getRecentlyUsedProjectsWithDetails(gcloudPath);

// Save a project as the selected project (automatically updates recently used list)
CacheManager.saveSelectedProject(projectId);
```

## Cache Invalidation

The cache is automatically invalidated in several situations:

1. **When Explicitly Cleared**: When the user clicks "Clear Cache"
2. **When TTL Expires**: When the cache TTL (time-to-live) expires
3. **When Dependencies Change**: When related data changes (e.g., a service is enabled/disabled)

## Implementation Components

The caching system consists of several interconnected components:

- **CacheManager**: Central utility for managing cached data
- **Command Cache**: For caching gcloud command results
- **Raycast Cache API**: For persisting data between sessions
- **Preferences File**: For maximum persistence of critical data
- **Global Command Cache**: For sharing cached commands across components 