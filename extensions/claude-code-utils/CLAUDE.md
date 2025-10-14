# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Workflow
- `npm run dev` - Start Raycast development server with hot reload
- `npm run build` - Build extension for production
- `npm run fix-lint` - Auto-fix linting issues (always run after code changes)
- `npm run lint` - Check linting (must pass before committing)

### Testing
- `npm test` - Run all tests
- `npm test -- --watch` - Run tests in watch mode
- `npm test -- --coverage` - Generate coverage report
- `npm test -- --testPathPatterns="<pattern>"` - Run specific test files (e.g., `--testPathPatterns="changelog"`)

### Publishing
- `npm run publish` - Publish to Raycast Store (not npm)

## Architecture Overview

### Extension Structure
This is a Raycast extension with 8 commands following the **List + Detail pattern**:
- Each command has an entry point in `src/<command-name>.tsx` that exports from `src/commands/<command-name>/list.tsx`
- List views (`list.tsx`) display searchable items
- Detail views (`detail.tsx`) show full content with actions
- Entry points exist for: `changelog`, `browse-agents`, `browse-commands`, `browse-snippets`, `create-snippet`, `sent-messages`, `received-messages`, `cheatsheet`

### Data Flow

**Claude Messages System** (`src/utils/claude-messages.ts`):
- Reads from `~/.claude/projects/` directory where Claude Code stores conversations
- Uses **streaming parsers** to handle large JSONL files without loading entire files into memory
- Scans 5 most recent projects × 5 most recent files per project (configurable via constants)
- Processes timestamped JSONL format with line-by-line reading via `createReadStream` + `readline`
- Key functions: `getSentMessages()`, `getReceivedMessages()`, `getSnippets()`, `pinMessage()`, `unpinMessage()`

**Search Architecture** (`src/utils/ai-search.ts`):
- Keyword search functionality for filtering messages and snippets
- Functions: `normalSearch()` for messages, `normalSearchSnippets()` for snippets

**Agents & Commands** (`src/utils/agents.ts`, `src/utils/commands.ts`):
- Read markdown files from `~/.claude/agents/` and `~/.claude/commands/`
- Parse YAML frontmatter for metadata
- Generate formatted names from kebab-case filenames

**Changelog Fetching** (`src/utils/changelog.ts`):
- Fetches from `https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md`
- Parses markdown to extract versions and changes
- Supports network simulation for testing (see below)

### Component Patterns

**Common List Component Structure**:
```typescript
// State management
const [items, setItems] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [searchText, setSearchText] = useState("");

// Load data on mount
useEffect(() => {
  async function loadData() {
    const data = await fetchFunction();
    setItems(data);
    setIsLoading(false);
  }
  loadData();
}, []);

// List with search
<List
  isLoading={isLoading}
  searchBarPlaceholder="Search items..."
>
```

**Date Grouping** (`src/utils/date-grouping.ts`):
- Messages are grouped by date periods (Today, Yesterday, This Week, etc.)
- Uses `groupMessagesByDate()` function that returns sections with titles
- Applied in sent-messages and received-messages list views

### Testing Infrastructure

**Jest Configuration** (`jest.config.js`):
- Uses `ts-jest` preset with `jsdom` environment
- Mocks `@raycast/api` via `src/__mocks__/raycast-api.ts`
- Setup file: `src/__tests__/setup.ts`
- Tests located in `src/__tests__/` and `src/utils/__tests__/`

**Test Patterns**:
- Component tests mock Raycast API components (List, Detail, ActionPanel, etc.)
- Utility tests mock Node.js modules (fs/promises, readline, etc.)
- Always mock external dependencies (fetch, Raycast AI, filesystem)
- Aim for 90%+ coverage on new utilities

**Example Test Structure**:
```typescript
// Mock before imports
jest.mock('@raycast/api');
jest.mock('fs/promises');

// Import after mocking
import { functionToTest } from '../module';

// Get mocked function
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Test with mocked responses
mockFetch.mockResolvedValue({ ok: true, text: async () => 'data' });
```

## Special Features

### Network Simulation for Testing
Use `.env` file or environment variables to simulate slow network:
```bash
# In .env
SIMULATE_SLOW_NETWORK=true
NETWORK_DELAY_MS=5000

# Or via command line
SIMULATE_SLOW_NETWORK=true npm run dev
```
- Only works in development mode (`environment.isDevelopment`)
- Uses `dotenv` package (loaded in `src/utils/network-simulation.ts`)
- Applied to changelog fetching; can be added to other async operations

### React DevTools Integration
- Press `⌘ ⌥ D` during development to launch React DevTools
- Inspect component props and state in real-time
- Package `react-devtools` included in devDependencies

## Important Conventions

### File Naming
- Commands: kebab-case (e.g., `browse-snippets.tsx`)
- Components: PascalCase exports (e.g., `export default BrowseSnippets`)
- Utilities: kebab-case (e.g., `claude-messages.ts`, `date-grouping.ts`)

### Code Quality
- **Always run `npm run fix-lint` after changes** - this is critical for consistency
- Linting must pass before committing (enforced by Husky pre-commit hooks)
- Use TypeScript strict mode - all utilities and components are fully typed

### Post-Change Verification (REQUIRED)
After making any code changes, **ALWAYS verify the project is in a working state** by running:
1. `npm run fix-lint` - Auto-fix any linting issues
2. `npm run build` - Ensure compilation succeeds without errors
3. `npm test` - Verify all tests pass

**Do NOT consider a task complete until all three checks pass.** If any check fails, fix the issues before finishing.

### Data Sources
- Claude Code projects: `~/.claude/projects/`
- Claude Code agents: `~/.claude/agents/`
- Claude Code commands: `~/.claude/commands/`
- Pinned messages: `~/.claude/pinned_messages.json`

### Performance Considerations
- Large JSONL files: Use streaming parsers (see `claude-messages.ts`)
- Limit scanning to most recent data (5 projects × 5 files default)
- Use `useMemo` for expensive computations in React components