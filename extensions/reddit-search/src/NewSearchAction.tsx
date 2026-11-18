import { Action, Icon } from "@raycast/api";

/**
 * Returns from filtering-loaded-results back to entering a new Reddit query.
 *
 * Once results load, the search bar filters them locally (instant, no request).
 * "New Search" clears that and restores the query-entry state so the next ↵ runs a
 * fresh Reddit search — the two modes can't share the one search bar simultaneously.
 *
 * No `Keyboard.Shortcut.Common` member fits "new search", so this is a custom
 * shortcut — declared per-platform because the extension ships on macOS and Windows
 * (a bare `cmd` binding is broken on Windows).
 */
export default function NewSearchAction({ onNewSearch }: { onNewSearch: () => void }) {
  return (
    <Action
      title="New Search"
      icon={Icon.MagnifyingGlass}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "f" },
        Windows: { modifiers: ["ctrl", "shift"], key: "f" },
      }}
      onAction={onNewSearch}
    />
  );
}
