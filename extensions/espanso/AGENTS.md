# Espanso Extension - Agent Knowledge Base

## Project Overview

The Espanso Raycast extension provides a search interface for Espanso text expansion matches, allowing users to quickly find and use their configured text snippets from within Raycast.

## Architecture

### Core Components

#### 1. Main Index (`src/index.tsx`)
- **Purpose**: Primary search interface and state management
- **Key Features**:
  - Fetches and displays Espanso matches
  - Manages filtering by profile and category
  - Handles search functionality
  - Organizes matches by folder structure

#### 2. Match Item Component (`src/components/match-item/index.tsx`)
- **Purpose**: Displays individual match entries
- **Features**:
  - Shows triggers, labels, and replacement text
  - Displays category breadcrumbs
  - Provides copy/paste actions
  - Handles multiple triggers per match

#### 3. Dropdowns
- **Category Dropdown** (`src/components/category-dropdown/index.tsx`): Filters matches by category
- **Profile Dropdown** (`src/components/profile-dropdown/index.tsx`): Filters matches by profile context

#### 4. Utilities (`src/lib/utils.ts`)
- **`getMatches()`**: Main function that reads and parses Espanso YAML files
- **`formatCategoryName()`**: Formats category names with proper acronym handling (AI, API, UI, UX, etc.)
- **Import Resolution**: Handles Espanso's import system for YAML files

### Data Flow

1. Extension loads and calls `getMatches()` to read Espanso configuration
2. YAML files are parsed and matches are extracted
3. File paths are analyzed to derive:
   - Profile (from `profiles/` folder structure)
   - Category (from folder hierarchy)
   - Subcategory (from filename, hidden if "index")
4. Matches are formatted and organized for display
5. User can filter by profile and category using dropdowns
6. Selecting a match allows copy to clipboard or paste to frontmost app

## Key Features Implemented

### 1. Profiles Support
- Detects matches in `profiles/` folder structure
- Extracts profile name from path (e.g., `profiles/work/` → "Work")
- Provides profile dropdown for filtering
- Matches outside profiles are accessible from all contexts

### 2. Smart Category System
- **Full breadcrumb navigation**: Shows complete folder hierarchy
- **Proper acronym formatting**: Uses `formatCategoryName()` for 50+ tech acronyms
- **Index file handling**: Hides subcategory when filename is "index"
- **Customizable separator**: User preference for breadcrumb separator character

### 3. Breadcrumb Customization
- Setting in preferences to change separator (default: `·`)
- Common alternatives: `/`, `>`, `→`, `›`, `»`
- Applies consistently across all breadcrumb displays

### 4. Import Support
- Handles Espanso's `imports` field in YAML files
- Resolves relative paths and processes imported files
- Maintains correct categorization for imported matches

## Folder Structure Patterns

### Standard Structure
```
match/
  dev/
    snippets.yml
  writing/
    templates.yml
```
Result: Category = "Dev" or "Writing"

### Profiles Structure
```
match/
  profiles/
    work/
      dev/
        snippets.yml
    home/
      personal/
        notes.yml
```
Result: Profile = "Work"/"Home", Category = "Dev"/"Personal"

### Nested Structure
```
match/
  dev/
    tools/
      git.yml
```
Result: Category = "Dev · Tools" (with custom separator)

## Package.json Scripts

- `build`: Creates distribution build (`ray build -e dist`)
- `dev`: Runs development mode (`ray develop`)
- `lint`: Runs linting checks (`ray lint`)
- `fix-lint`: Fixes linting issues (`ray lint --fix`)
- `typecheck`: Runs TypeScript type checking (`tsc --noEmit`)
- `publish`: Publishes to Raycast store (`npx @raycast/api@latest publish`)

## Dependencies

### Production
- `@raycast/api`: Core Raycast API
- `@raycast/utils`: Raycast utility functions
- `change-case`: Text case conversion utilities
- `fs-extra`: Enhanced file system operations
- `yaml`: YAML parsing

### Development
- `@raycast/eslint-config`: Raycast ESLint configuration
- `@types/*`: TypeScript type definitions
- `eslint`: Linting
- `prettier`: Code formatting
- `typescript`: Type checking

## Raycast Store Requirements

### Code Quality Checklist
- ✅ `npm run build` - Must complete successfully
- ✅ `npm run lint` - Must pass without errors
- ✅ `npm run typecheck` - Must pass without type errors
- ✅ Extension opens correctly in Raycast

### Metadata Requirements (package.json)
- ✅ `license`: Must be "MIT"
- ✅ `author`: Raycast account username
- ✅ `categories`: At least one, using Title Case
- ✅ Latest `@raycast/api` version

### Documentation
- ✅ `CHANGELOG.md`: Required at root with specific format
  - Use h2 headers: `## [Title] - {PR_MERGE_DATE}`
  - Include detailed bullet points
- ✅ `README.md`: Required if setup needed (API keys, preferences)

### Assets
- Icons: 512x512px PNG, works in light/dark themes
- Screenshots: 2000×1250px, 16:10 ratio, PNG format
- All assets in `media/` folder at extension root

### Best Practices
- Use Preferences API for configuration
- Apply Title Case to action panel items
- Include icons in action lists
- Implement proper empty states
- No external analytics
- US English spelling only

## Development Tips

### Adding New Features
1. Run `npm run typecheck` frequently during development
2. Use `npm run lint` to ensure code style consistency
3. Test with `npm run dev` before building
4. Always update CHANGELOG.md with new features

### Category Handling
- Categories are derived from folder structure automatically
- Use `formatCategoryName()` for consistent display formatting
- Breadcrumb separator comes from user preferences
- Base categories are sorted first

### Working with Espanso Files
- YAML files are read from Espanso's match directory
- Imports are resolved recursively
- File paths determine category structure
- Multiple triggers per match are supported

## Testing Considerations

Before submitting changes:
1. Test with various folder structures
2. Verify profile filtering works correctly
3. Check breadcrumb display with different separators
4. Test with matches containing imports
5. Verify acronyms format correctly (AI, API, UI, etc.)
6. Ensure "index" files behave as expected
7. Run all quality checks (build, lint, typecheck)

## Recent Improvements (Current PR)

### Features Added
- Profiles support with automatic detection and filtering
- Customizable breadcrumb separator preference
- Proper acronym formatting across the UI
- Smart index file handling (hides redundant subcategory)
- Full folder hierarchy breadcrumb navigation
- TypeScript type checking script

### Refactoring
- Separated folder and filename logic in category derivation
- Centralized category name formatting
- Improved breadcrumb path generation
- Better state management for profiles and categories

### Technical Improvements
- Added TypeScript type checking to development workflow
- Upgraded dependencies to latest versions
- Improved code quality and maintainability
- Better type safety throughout the codebase
