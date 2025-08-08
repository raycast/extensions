# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Raycast extension for the "duan" URL shortener service. It allows users to create and manage short links through Raycast commands, connecting to a Cloudflare Workers-based API backend.

## Development Commands

### Essential Commands
- **Run extension in development**: `npm run dev`
- **Build extension**: `npm run build`
- **Run linting**: `npm run lint`
- **Fix linting issues**: `npm run fix-lint`
- **Publish to Raycast Store**: `npm run publish`

### Testing
The extension uses manual testing through Raycast's development mode (`npm run dev`). There is no automated test suite currently configured.

## Architecture Overview

### Core Components
1. **Commands** (entry points):
   - `shorten-link.tsx`: Create new short links with custom or random slugs
   - `list-links.tsx`: Search and manage existing links

2. **API Layer** (`src/services/api/`):
   - Uses preference-based configuration (host/token from Raycast preferences)
   - Endpoints handle links CRUD operations and slug availability checks
   - All API calls require authentication via Bearer token

3. **Validation System** (`src/services/validation/`):
   - URL validation: Ensures proper URL format with protocol
   - Slug validation: Format checking and availability verification
   - Implements caching strategy for slug availability (uses Raycast's Cache API)

4. **State Management**:
   - `useLinks` hook: Manages link data fetching with caching (uses `useCachedPromise`)
   - Form validation: Real-time validation with custom validators
   - Search: Client-side filtering across slug, URL, and description fields

### Key Technical Decisions
1. **Caching Strategy**:
   - Link list: Uses `useCachedPromise` for stale-while-revalidate behavior
   - Slug validation: Uses low-level Cache API for synchronous validation during form input

2. **Search Implementation**:
   - Client-side search with partial matching support
   - Case-insensitive and Unicode-aware
   - Searches across multiple fields simultaneously

3. **Error Handling**:
   - API errors show toast notifications with specific error messages
   - Form validation provides inline error feedback
   - Network failures gracefully fall back to cached data

## API Integration
The extension expects a duan API service with these endpoints:
- `GET /api/shortcodes` - Fetch all used slugs
- `GET /api/links` - List all links
- `POST /api/links` - Create new link
- `PUT /api/links/{slug}` - Update existing link
- `DELETE /api/links/{slug}` - Delete link

All endpoints require Bearer token authentication configured in Raycast preferences.

## Configuration
Extension preferences (user-configurable):
- `host`: API host URL (required)
- `token`: API authentication token (required)
- `slugChars`: Characters for random slug generation (default: "abcdefghijkmnpqrstuvwxy23456789")
- `slugLength`: Length of generated slugs (default: "4")