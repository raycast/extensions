# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension called `ccusage` that provides real-time monitoring of Claude Code usage. It integrates with the external `ccusage` npm package to fetch usage statistics and displays them through both a main list view and a menu bar interface.

## Architecture

### Modern Functional Architecture

The extension follows a simplified functional architecture with layered hook abstraction:

```
ccusage CLI tool → useCCUsage*Cli hooks → use*Usage hooks → Pure Functions → UI Components
```

#### Hook Layer Separation
- **CLI Layer**: Direct command execution (`useCCUsageDailyCli`, `useCCUsageMonthlyCli`, etc.)
- **Data Layer**: Data transformation and business logic (`useDailyUsage`, `useMonthlyUsage`, etc.)
- **Availability Layer**: System dependency checking (`useCCUsageAvailability`)

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
- Simplified error handling with clear user guidance
- Standardized error accessories via `STANDARD_ACCESSORIES` constants for consistent UI

### Component Architecture

Each major UI section is a focused component with shared common utilities:

#### Core Components
- `DailyUsage`: Today's usage with intensity visualization
- `SessionUsage`: Recent sessions with model-specific icons  
- `CostAnalysis`: Cost breakdown and projections with inline calculations
- `ModelBreakdown`: Model-wise usage analysis with tier grouping
- `ErrorState`: Initial configuration guidance for ccusage setup
- `ErrorMetadata`: Error state metadata and categorization handling

#### Common Utilities
- `StandardActions`: Shared external link and action management
- `accessories`: Standardized accessory configurations for consistent UI patterns

## Modern Dependencies

### Core Libraries

- **zod**: Runtime type validation and schema definition with TypeScript inference
- **ts-pattern**: Elegant pattern matching for conditional logic and data transformation
- **date-fns**: Robust date handling and internationalization support
- **usehooks-ts**: Additional React hooks including `useInterval` for real-time updates
- **es-toolkit**: Modern lodash alternative for data aggregation and processing

### External Dependencies

The extension requires the `ccusage` npm package available via `npx ccusage@latest`:

- Commands: `daily --json`, `session --json`, `monthly --json`, `--json`
- JSON output format with fields: `inputTokens`, `outputTokens`, `totalTokens`, `totalCost`, `sessions`, `cacheCreationTokens`, `cacheReadTokens`
- Local file access to Claude Code usage history
- Model breakdown support via `modelBreakdowns` field with `modelName` property
- Enhanced PATH resolution for various Node.js installation scenarios

## File Organization

```
src/
├── ccusage.tsx              # Main command entry point
├── menubar-ccusage.tsx      # Menu bar command entry point
├── preferences.ts           # Centralized preference management
├── components/              # UI components
│   ├── DailyUsage.tsx       # Today's usage display
│   ├── SessionUsage.tsx     # Recent sessions history
│   ├── CostAnalysis.tsx     # Cost breakdown and projections
│   ├── ModelBreakdown.tsx   # Model-wise usage analysis
│   ├── ErrorState.tsx       # Initial configuration guidance
│   ├── ErrorMetadata.tsx    # Error state metadata handling
│   └── common/              # Shared component utilities
│       ├── StandardActions.tsx # External links and actions
│       └── accessories.ts   # Standard accessory definitions
├── hooks/
│   ├── useCCUsageAvailability.ts    # System dependency checking
│   ├── useCCUsage*Cli.ts           # CLI command execution hooks (4 variants)
│   ├── use*Usage.ts                # Data transformation hooks (4 variants)
│   └── use-current-date.ts         # Current date with `date +%Y-%m-%d`
├── types/
│   └── usage-types.ts       # Zod schemas + inferred TypeScript types
└── utils/
    ├── data-formatter.ts    # Pure formatting functions
    ├── usage-calculator.ts  # Pure calculation functions
    ├── model-utils.ts       # Model-specific utilities and icons
    ├── exec-options.ts      # Common exec configuration
    ├── messages.ts          # Message constants and strings
    └── node-path-resolver.ts # Enhanced Node.js PATH resolution
```

## Development Guidelines

### Large-Scale Modification Methodology

#### Staged Modification Approach

- **Phase-Based Execution**: Break large changes into sequential phases (emergency → high → medium priority)
- **Risk Mitigation**: Limit scope of each modification stage to contain potential issues
- **Continuous Verification**: Run quality checks (`npm run typecheck && npm run lint && npm run build`) at each stage
- **TODO-Driven Development**: Use TodoWrite for detailed progress tracking and completion verification

#### Pre-Modification Investigation

- **Impact Analysis**: Comprehensive search to identify all affected files and usage patterns
- **Dependency Mapping**: Create relationship maps for schemas, types, and cross-file dependencies  
- **Test Strategy**: Plan validation approach before beginning modifications
- **Scope Documentation**: Document expected changes with concrete examples

#### External API Compliance Priority

- **CLI-First Design**: Prioritize external CLI/API specifications over internal compatibility
- **Schema Purity**: Avoid custom fields that deviate from external specifications
- **Direct Field Usage**: Reference CLI response fields directly rather than creating translations
- **Specification Adherence**: Maintain 100% compliance with external data contracts

#### Quality Assurance Process

- **Incremental Testing**: Validate each modification phase independently
- **Type Safety Enforcement**: Eliminate `any` types and dangerous type conversions
- **Null/Undefined Consistency**: Standardize on single nullable approach project-wide
- **Documentation Standards**: Maintain English-only comments for internationalization

### Code Style Preferences

#### Core Principles

- **YAGNI (You Aren't Gonna Need It)**: Avoid premature abstraction and over-engineering
- **Directness over Cleverness**: Prefer explicit, obvious code over clever abstractions
- **Colocation**: Keep related code close together; avoid unnecessary file separation
- **Type Safety**: Let TypeScript's type system express intent rather than comments

#### Function and Component Design

- **Functions over Classes**: Use arrow functions for utilities, function declarations for components
- **Eliminate Stateless Functions**: Replace functions that return static values with direct values
- **React Naming Conventions**: Use `render*` prefix for functions returning JSX/ReactNode
- **Pure Functions**: Avoid side effects in utility functions
- **Type over Interface**: Prefer `type` aliases over `interface` declarations; use `interface` for extending

#### Abstraction Guidelines

- **Constants over Hooks**: Prefer simple constants over custom hooks for static data
- **Inline over Extract**: Keep simple logic inline rather than extracting to helper functions
- **Direct Conditionals**: Use explicit ternary operators instead of abstracted logic functions
- **Shared Constants**: Extract only truly reusable values (messages, configurations) to constants

#### Documentation Philosophy

- **Minimal JSDoc**: Only document complex algorithms, workarounds, or non-obvious business logic
- **Types as Documentation**: Use descriptive type names and interfaces instead of comments
- **Self-Documenting Code**: Prefer clear variable and function names over explanatory comments
- **English Only**: All code comments must be in English for internationalization consistency

#### Code Organization

- **Colocation Principle**: Keep component-specific configurations within the component file
- **Utility Libraries**: Use es-toolkit (lodash alternative) for aggregation and data processing
- **No `any` Type**: Avoid `any` type usage; create proper interfaces or use union types
- **Functional Patterns**: Use `ts-pattern` for complex conditional logic when necessary

#### React Component Design Principles

- **Hooks at Top Level**: Always call hooks at component top level, never inside conditions, loops, or nested functions
- **Functional Components**: Use function declarations for components, arrow functions for utilities
- **Null Safety in Hooks**: Handle null/undefined data within hooks using conditional logic and optional chaining
- **Component Separation**: Keep render logic separate from business logic through proper abstraction
- **Memoization Strategy**: Use `useMemo` for expensive calculations, `useCallback` for function references

#### Examples of Preferred Patterns

```typescript
// ❌ Over-abstracted
const getTrendIcon = (): Icon => Icon.Calendar;
const useStandardAccessories = (error, data, formatter, icon) => { /* logic */ };

// ✅ Direct and clear
const icon = { source: Icon.Calendar, tintColor: Color.SecondaryText };
const accessories = error ? STANDARD_ACCESSORIES.ERROR : !data ? STANDARD_ACCESSORIES.NO_DATA : [{ text: formatCost(data.cost), icon: Icon.Coins }];

// ❌ Centralized config far from usage
// utils/component-config.ts
export const CONFIGS = { daily: { message: "..." } };

// ✅ Colocated with usage
// components/DailyUsage.tsx
const externalLinks: ExternalLink[] = [
  { title: "View CCUsage Repository", url: "https://github.com/...", icon: Icon.Code }
];
```

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
- **Global Type Definition**: Preferences interface auto-generated in `raycast-env.d.ts` from `package.json` manifest

## Code Quality Practices

- **TypeScript Strict Mode**: Maintain strict typing throughout
- **Zod Validation**: Runtime type checking for external data
- **ESLint Configuration**: Follow Raycast's official ESLint config with `@typescript-eslint/no-explicit-any` enforcement
- **Prettier Formatting**: Consistent code formatting
- **Dependency Management**: Use knip to detect unused dependencies and exports
- **Pre-commit Workflow**: Always run `npm run typecheck && npm run lint && npm run build` before committing
- **Git State Management**: Ensure all files are properly tracked and no unintended deletions exist
- **No Debug Code**: Remove console.log statements before commits

### Quality Verification Commands
```bash
# Complete quality check pipeline
npm run typecheck && npm run lint && npm run build

# Auto-fix formatting and linting issues
npm run fix-lint

# Dependency cleanup check
npm run knip
```

### Development Checklist

Before committing React component changes:

- [ ] **Hooks compliance**: All hooks at component top level (never in conditions/loops/nested functions)
- [ ] **Type safety**: No `any` types, proper interfaces for props and data
- [ ] **Null handling**: Graceful handling of undefined/null data within hooks
- [ ] **Performance**: Appropriate use of `useMemo`/`useCallback` for expensive operations
- [ ] **ESLint clean**: No linting warnings, especially `react-hooks/rules-of-hooks`

## Development Status

- **Under Development**: Extension is actively being developed with experimental features
- **Unofficial**: Not affiliated with Anthropic or ccusage maintainers
- **Raycast Store**: Use `npm run publish` to submit to Raycast Store (not npm publish)
