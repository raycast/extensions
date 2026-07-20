## Project Context

This is a Raycast extension for controlling Music Assistant, a home music server system. The extension provides menu bar controls and commands for music playback, player selection, and volume control.

## Code Quality Standards

### Testing Philosophy

- **Always write unit tests** - Don't forget tests
- **Proper test organization**: Put client tests in client test files, command-specific tests in command test files
- **Clean test files**: Remove unused imports, variables, and mock configurations
- **Focus on critical path**: Test business logic thoroughly, not 100% coverage
- **Test error cases**: Always test both success and failure scenarios
- **Regression tests**: Add tests for any bugs found to prevent recurrence

### Code Organization

- **Respect existing file structure**: Don't put tests in wrong files
- **Clean imports**: Group and organize import statements properly
- **Remove unused code**: Clean up unused variables, imports, and dependencies
- **Auto-generated Preferences**: Do NOT manually define a `Preferences` interface - Raycast auto-generates it in `raycast-env.d.ts` from `package.json`. Use `getPreferenceValues<Preferences>()` directly

### API Integration Patterns

- **Follow established patterns**: Look at similar commands (play-pause, next-song, etc.)
- **Error handling**: Always handle API errors gracefully with try/catch
- **Investigate actual APIs**: When things don't work, check the Music Assistant API documentation and refer to the official frontend implementation
- **Raycast-specific**: Use React Form components instead of imperative prompts

### User Experience

- **Smart UI**: Only show controls for supported features
- **Visual feedback**: Use appropriate icons and status indicators
- **Real-time updates**: Refresh data when changes are made

## Technical Stack

- **Framework**: Raycast extension using TypeScript and React
- **Testing**: Jest with comprehensive mocking
- **External API**: Music Assistant REST API (`POST http://host:8095/api`)
- **UI Components**: Raycast's MenuBarExtra, Form, ActionPanel
- **State Management**: useCachedPromise, useCachedState, useLocalStorage

## REST API Architecture

- **API Endpoint**: `POST http://host:8095/api`
- **Authentication**: Bearer token in Authorization header
- **Request Format**: `{ "command": "...", "args": { ... } }`
- **Client**: `src/external-code/music-assistant-api.ts` - REST API calls
- **Wrapper**: `src/api-command.ts` - Initialization and cleanup
- **Business Logic**: `src/music-assistant-client.ts` - High-level methods
- **API Documentation**: `commands.json` - Complete API reference (generated from Music Assistant backend)

### Key Implementation Details

- `sendCommand()` is the core method - all API calls go through it
- Error handling: Check for `error_code`, `error`, and `details` fields in response
- Always handle null/undefined responses safely
- Volume commands clamp values to 0-100 range
- Use `player_id` parameter for most player-specific commands

## Music Assistant Player Concepts

**Player Properties**:

- `player_id`: Unique identifier
- `group_childs`: Array of member IDs if this player is a group leader
- `synced_to`: Group leader ID if this player is synced to a group
- `active_group`: Alternative group reference (used in some contexts)
- `group_members`: List of all members (populated server-side)
- `group_volume`: Volume level of the entire group
- `volume_level`: Individual player volume

**Volume Control Logic**:
Use `shouldUseGroupVolume(player)` to determine strategy:

- **Group leaders with members**: Use `players/cmd/group_volume*` commands - affects entire group
- **Group members**: Use `synced_to`/`active_group` as target - controls via group leader
- **Standalone players**: Use player's own `player_id` - individual control

API commands:

- `players/cmd/group_volume`: Set group to specific level
- `players/cmd/group_volume_up` / `players/cmd/group_volume_down`: Adjust group
- `players/cmd/volume_set`: Set individual player volume
- `players/cmd/volume_up` / `players/cmd/volume_down`: Adjust individual

**Reference**: See the official Music Assistant frontend (`music-assistant/frontend`) for how the native UI implements volume control - it uses the same group/individual strategy.

## Development Workflow

- **Environment**: Use nvm to manage Node.js versions (follow .nvmrc)
- **Testing**: Run tests after implementation, before submitting
- **Validation**: Test extension in development mode
- **Pre-publish checks**: test, lint and build run automatically via `prepublish` script
- **Publishing**: Use `npm run publish` (not `npm publish`)

## Code Style

- **Documentation**: Write comprehensive JSDoc comments for public methods
- **Error messages**: Provide clear, actionable error messages
- **Method naming**: Use descriptive names indicating purpose and return type
- **Type safety**: Use TypeScript types properly, import from interfaces

## Documentation Standards

- **README.md**: ❌ DO NOT MODIFY - Published on Raycast Store
- **CONTRIBUTING.md**: Developer setup, commands, contribution guidelines
- **TESTING.md**: Test coverage rationale and strategy
- **CHANGELOG.md**: Always update with new features, fixes, improvements
  - Use `{PR_MERGE_DATE}` placeholder instead of hardcoded dates
  - Format: `## [Title] - {PR_MERGE_DATE}`
  - Organize with headers: ✨ New Features, 🔧 Technical Improvements, 🎨 UI/UX
  - **⚠️ CRITICAL**: Before adding new entries, check if one with `{PR_MERGE_DATE}` exists (unmerged PR). If so, consolidate new features into that entry instead of creating a new one. Only create new entries when releasing a version.

## React Hooks & State Management

### Supported Hooks

- ✅ `useCachedPromise` - Caches API call results between command runs
- ✅ `useCachedState` - Persists state across command invocations
- ✅ `useLocalStorage` - Stores user preferences and selections
- ✅ `usePromise` - One-off async operations
- ✅ `useForm` - Form state management with integrated validation
- ✅ Standard React: `useState`, `useEffect`

### Unsupported / Anti-patterns

- ❌ `useMemo`, `useCallback` - Not available in Raycast
- ❌ `useCachedPromise` with `execute: true` always - Will refetch on every menu bar open
- ➡️ Use `execute: isBackgroundRefresh` instead to control when fetches happen
- ❌ Manual form state management with useState - Use `useForm` instead

## Form Handling with useForm

The `useForm` hook from `@raycast/utils` provides a high-level interface for handling forms with built-in validation and error display.

### Basic Pattern

```typescript
import { useForm } from "@raycast/utils";
import { Form, ActionPanel, Action } from "@raycast/api";

interface FormValues {
  volume: string;
}

export default function SetVolumeCommand() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      // values are automatically validated before this is called
      console.log("Valid volume:", values.volume);
    },
    initialValues: {
      volume: "50",
    },
    validation: {
      volume: (value) => {
        // Return error message string, or undefined/null if valid
        const num = Number(value);
        if (!value) return "Volume is required";
        if (isNaN(num)) return "Enter a number";
        if (num < 0 || num > 100) return "Enter a number between 0 and 100";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Volume" placeholder="0-100" {...itemProps.volume} />
    </Form>
  );
}
```

### Key Features

- **Automatic validation**: Form won't submit if validation fails
- **Error display**: Validation errors appear inline on form fields
- **Type-safe**: Full TypeScript support with generic type parameter
- **Integrated state**: `itemProps` handles field state automatically
- **No manual error handling**: Just return error string from validation function

### Validation

Validation rules are functions that:

- Receive the field value
- Return `undefined` or `null` if valid
- Return an error string if invalid

```typescript
validation: {
  email: (value) => {
    if (!value) return "Email is required";
    if (!value.includes("@")) return "Enter a valid email";
  },
  age: (value) => {
    const num = Number(value);
    if (isNaN(num)) return "Enter a number";
    if (num < 18) return "Must be 18 or older";
  },
}
```

### Return Value

`useForm` returns:

- **`handleSubmit`**: Pass to `Action.SubmitForm.onSubmit` - handles validation before calling your `onSubmit`
- **`itemProps`**: Spread onto form fields: `<Form.TextField {...itemProps.fieldName} />`
- **`values`**: Current form values (updates in real-time)
- **`setValue`**: Programmatically set a field value
- **`setValidationError`**: Programmatically set a field error
- **`focus`**: Programmatically focus a field
- **`reset`**: Reset form to initial values

## Navigation Architecture

Raycast provides two navigation patterns via the `useNavigation()` hook:

### Navigation Stack (Push/Pop Pattern)

```typescript
import { useNavigation } from "@raycast/api";

export default function Home() {
  const { push } = useNavigation();

  return (
    <List>
      <List.Item
        title="Details"
        actions={
          <ActionPanel>
            <Action title="View" onAction={() => push(<Details />)} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function Details() {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown="Details here"
      actions={
        <ActionPanel>
          <Action title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
```

### Push/Pop Characteristics

- **Push**: Adds a new view to the stack
- **Pop**: Removes current view and returns to previous one
- **ESC**: Automatically pops (built-in behavior)
- **Idiomatic**: Follows Raycast's default navigation paradigm
- **Limitations**: Switching between sibling views requires popping to root and re-pushing

### When to Consider Tabs Instead

For hub-like interfaces with multiple browsable sections:

- Use **local state (tabs)** when: Users switch frequently between sections, state should persist during switches, search/filtering spans all sections
- Use **push/pop** when: Deep hierarchical navigation, each section is independent, clear parent-child relationships

This project uses a **tabs approach** for the Music Library Hub because users frequently switch between Browse, Recently Played, and Queue Manager, and switching should preserve their position in each section.

## Menu Bar Command Architecture

Menu bar commands have a **different lifecycle** than regular commands.

### Configuration (package.json)

```json
{
  "name": "menu-bar",
  "mode": "menu-bar",
  "interval": "10s"
}
```

### Pattern

```typescript
import { environment } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

export default function MenuBar() {
  const isBackgroundRefresh = environment.launchType === "background";

  // Only fetch during background refresh
  const { isLoading, revalidate } = useCachedPromise(
    async () => {
      const data = await client.fetchData();
      setCachedData(data);
      return data;
    },
    [],
    {
      execute: isBackgroundRefresh,  // ⭐ Only fetch in background
      keepPreviousData: true
    }
  );

  // Show loading only during background refresh
  const showLoading = isBackgroundRefresh && isLoading;

  // Always use cached data for rendering
  return (
    <MenuBarExtra isLoading={showLoading}>
      {/* Render cached data immediately */}
    </MenuBarExtra>
  );
}
```

**Why this matters**: Without this pattern, the menu bar fetches API data every time the user opens it. If the API is slow, the menu times out or appears blank.

### Best Practices

1. **Use `execute: isBackgroundRefresh`** - Prevents API calls during user interactions
2. **Never show loading spinner** when user opens menu (only during background refresh)
3. **Use `useCachedState`** to persist data between opens
4. **Call `revalidate()`** in action handlers to refresh after user actions
5. **Set reasonable timeouts** - Menu bar has ~8-10 second budget per background cycle

## Common Mistakes to Avoid

- ❌ Fetching fresh API data every menu bar render (causes timeouts)
- ❌ Testing individual REST API wrapper methods (test `sendCommand()` instead)
- ❌ Writing client tests in command test files
- ❌ Showing UI controls for unsupported features
- ❌ Hard-coding values that should be dynamic
- ❌ Removing error handling for null/undefined responses
- ❌ Making sequential API calls when parallel is possible
- ❌ Very long titles in menu bar items
- ❌ Ignoring `environment.launchType` in menu bar commands
- ❌ Modifying README.md (it's published on store)
- ❌ Managing form state manually with `useState` - Use `useForm` instead
- ❌ Separating form fields from form validation logic - Keep them in one `useForm` definition
- ❌ Creating separate form component files for simple forms - Keep commands self-contained
