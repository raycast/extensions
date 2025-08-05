import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import Fuse from "fuse.js";
import { tmuxCommands, TmuxCommand } from "./tmuxCommands";
import CommandDetail from "./CommandDetail";

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation(); // Navigation hook to push details page

  // Use our custom debounce hook to update the search text after 100ms of inactivity.
  const debouncedSearchText = useDebounce(searchText, 100);

  // Memoize Fuse options for efficiency.
  const fuseOptions = useMemo(
    () => ({
      keys: ["id", "command", "description", "category", "benefit"],
      includeScore: true,
      threshold: 0.4, // Adjust to fine-tune matching leniency.
    }),
    [],
  );

  // Create a Fuse index only once (since tmuxCommands is static).
  const fuse = useMemo(() => new Fuse(tmuxCommands, fuseOptions), [fuseOptions]);

  // Filter commands based on the debounced search text.
  const filteredCommands: TmuxCommand[] = useMemo(() => {
    if (debouncedSearchText.trim() === "") {
      return tmuxCommands;
    }
    return fuse.search(debouncedSearchText).map((result) => result.item);
  }, [debouncedSearchText, fuse]);

  return (
    <List navigationTitle="Tmux Commands" searchText={searchText} onSearchTextChange={setSearchText}>
      {filteredCommands.map((cmd) => (
        <List.Item
          key={cmd.id}
          title={cmd.id}
          subtitle={cmd.description}
          accessories={[{ text: cmd.category }]}
          icon={cmd.icon}
          actions={
            <ActionPanel>
              <Action title="View Details" onAction={() => push(<CommandDetail command={cmd} />)} />
              <Action.CopyToClipboard title="Copy Command" content={cmd.command} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
