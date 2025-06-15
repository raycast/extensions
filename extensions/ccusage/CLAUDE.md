# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension called `ccusage` that provides real-time monitoring of Claude Code usage. It integrates with the external `ccusage` npm package to fetch usage statistics and displays them through both a main list view and a menu bar interface.

## Architecture

### Modern Functional Architecture

The extension follows a simplified functional architecture after recent refactoring:

```
ccusage CLI tool → useExec hooks → Pure Functions → UI Components
```

### Key Components

- **Direct Integration**: Uses `@raycast/utils` `useExec` directly with enhanced PATH configuration
- **Pure Functions**: Utility functions for data formatting and calculations (no classes)
- **Type Safety**: Zod schemas for runtime validation with TypeScript type inference
- **Dual UI Modes**: Main list view (`ccusage.tsx`) and menu bar (`menubar-ccusage.tsx`)

### Data Flow Architecture

1. **Command Execution**: Enhanced PATH configuration ensures ccusage availability across different Node.js setups
2. **Type Validation**: Zod schemas validate JSON responses from ccusage CLI
3. **Real-time Updates**: Refresh intervals optimized per component (1s menu bar, 5s main view)
4. **Model Differentiation**: Visual indicators differentiate Claude models (Opus=Crown, Sonnet=Stars, Haiku=Leaf)

## Development Commands

```bash
# Build extension for production
npm run build

# Develop with hot reload (for extension testing)
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Auto-fix linting issues
npm run fix-lint

# Check for unused dependencies and exports
npm run knip

# Publish to Raycast Store
npm run publish
```

## Key Technical Patterns

### Functional Programming Approach

- **Pure Functions**: All utilities are pure arrow functions without side effects
- **No Classes**: Replaced static classes with exported functions
- **Immutable Data**: State transformations through functional patterns

### Type System with Runtime Validation

```typescript
// Modern approach: Zod schema + type inference
export const DailyUsageDataSchema = z.object({
  date: z.string(),
  inputTokens: z.number(),
  // ...
});
export type DailyUsageData = z.infer<typeof DailyUsageDataSchema>;
```

### Enhanced PATH Configuration

The extension handles various Node.js installation scenarios to ensure npx availability:

- Homebrew (Apple Silicon vs Intel)
- Node Version Managers (nvm, fnm, n, volta)
- Global npm/yarn installations
- System paths
- Custom npx path override through preferences

### Date Processing with `date +%Y-%m-%d`

The extension uses `date +%Y-%m-%d` command via `useCurrentDate` hook for simplified date handling:

- System-native current date retrieval without timezone complexity
- Eliminates need for user timezone configuration
- Automatic local time zone detection through OS

### Error Handling Strategy

- Functions return `null` on failure rather than throwing exceptions
- UI components gracefully handle loading states and display fallback messages
- Zod validation provides runtime type safety with detailed error information

### Component Architecture

Each major UI section is a focused component:

- `DailyUsage`: Today's usage with intensity visualization
- `SessionUsage`: Recent sessions with model-specific icons  
- `CostAnalysis`: Cost breakdown and projections with inline calculations
- `ModelBreakdown`: Model-wise usage analysis with tier grouping
- `ErrorState`: Initial configuration guidance for ccusage setup

## Modern Dependencies

### Core Libraries

- **zod**: Runtime type validation and schema definition
- **ts-pattern**: Elegant pattern matching for conditional logic
- **date-fns**: Robust date handling and internationalization
- **usehooks-ts**: Additional React hooks including `useInterval`

### External Dependencies

The extension requires the `ccusage` npm package available via `npx ccusage@latest`:

- Commands: `daily --json`, `session --json`, `monthly --json`, `--json`
- JSON output format with fields: `inputTokens`, `outputTokens`, `totalTokens`, `cost`, `sessions`, `cacheCreationTokens`, `cacheReadTokens`
- Local file access to Claude Code usage history
- Model breakdown support via `modelBreakdowns` field with `modelName` property

## File Organization

```
src/
├── ccusage.tsx              # Main command entry point
├── menubar-ccusage.tsx      # Menu bar command entry point
├── preferences.ts           # Centralized preference management
├── components/              # UI components
│   ├── DailyUsage.tsx
│   ├── SessionUsage.tsx
│   ├── CostAnalysis.tsx
│   ├── ModelBreakdown.tsx
│   └── ErrorState.tsx
├── hooks/
│   ├── use-usage-data.ts    # Data fetching hooks
│   └── use-current-date.ts  # Current date hook with `date -I`
├── types/
│   └── usage-types.ts       # Zod schemas + inferred types
└── utils/
    ├── data-formatter.ts    # Pure formatting functions
    ├── model-utils.ts       # Model-specific utility functions
    └── usage-calculator.ts  # Pure calculation functions
```

## Development Guidelines

### Code Style Preferences

- **Functions over Classes**: Use arrow functions for utilities, function declarations for components
- **Type over Interface**: Prefer `type` aliases over `interface` declarations
- **Pure Functions**: Avoid side effects in utility functions
- **Functional Patterns**: Use `ts-pattern` for complex conditional logic
- **Type Annotations**: Always provide type annotations for function parameters and return values
- **Concise Logic**: Keep calculation logic simple and readable
- **Utility Libraries**: Use es-toolkit (lodash alternative) for aggregation and data processing

### Git Workflow

- **Conventional Commits**: Use prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `chore:`)
- **Logical Separation**: Split changes into focused commits for easier review
- **English Messages**: All commit messages and documentation in English

### Error Handling Patterns

```typescript
// Preferred: Return null on validation failure
export const validateData = (data: unknown): ValidType | null => {
  const result = Schema.safeParse(data);
  return result.success ? result.data : null;
};

// UI: Graceful degradation
if (!data) {
  return <Detail markdown="No data available" />;
}
```

### Performance Considerations

- **Selective Refresh**: Different refresh intervals per component based on data volatility
- **Inline Calculations**: Simple operations computed inline rather than abstracted
- **Minimal Abstractions**: Avoid over-engineering for maintainability

## Preference System

The extension includes a simplified preference system for user customization:

- **Default View**: Choose which section appears first (Today Usage, Session History, Cost Analysis, Model Breakdown)
- **Custom npx Path**: Override default npx path for non-standard Node.js installations
- **Centralized Management**: All preferences handled through `src/preferences.ts` module
- **Raycast Integration**: Uses `getPreferenceValues` from `@raycast/api` for type-safe access

## Code Quality Practices

- **TypeScript Strict Mode**: Maintain strict typing throughout
- **Zod Validation**: Runtime type checking for external data
- **ESLint Configuration**: Follow Raycast's official ESLint config
- **Prettier Formatting**: Consistent code formatting
- **Dependency Management**: Use knip to detect unused dependencies and exports
- **Pre-commit Check**: Run `npm run knip` before committing to ensure clean codebase
- **No Debug Code**: Remove console.log statements before commits

## Development Status

- **Under Development**: Extension is actively being developed with experimental features
- **Unofficial**: Not affiliated with Anthropic or ccusage maintainers
- **Raycast Store**: Use `npm run publish` to submit to Raycast Store (not npm publish)
