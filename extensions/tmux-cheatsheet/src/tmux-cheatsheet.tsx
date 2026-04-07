import { Action, ActionPanel, Icon, List, getPreferenceValues, useNavigation } from "@raycast/api";
import { useMemo, useState, useEffect } from "react";
import Fuse from "fuse.js";
import { tmuxCommands, TmuxCommand } from "./tmuxCommands";
import { detectPrefix } from "./prefixDetector";
import { detectKeyBindings, commandSignature } from "./keybindingDetector";
import CommandDetail from "./CommandDetail";
import { prettifyKey } from "./formatKeys";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function formatShortcut(prefix: string, shortcut: string): string {
  return `${prettifyKey(prefix)} ${prettifyKey(shortcut)}`;
}

function accessoryText(cmd: TmuxCommand, prefix: string): string {
  return cmd.shortcut ? formatShortcut(prefix, cmd.shortcut) : cmd.command;
}

const ALL_CATEGORIES = "all";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const { push } = useNavigation();
  const prefixOverride = getPreferenceValues<Preferences>().prefix;
  const prefix = useMemo(() => prefixOverride || detectPrefix() || "C-b", [prefixOverride]);

  const debouncedSearchText = useDebounce(searchText, 100);

  const enrichedCommands = useMemo(() => {
    const keyBindings = detectKeyBindings();
    return tmuxCommands.map((cmd) => {
      const tmuxCmd = cmd.command.startsWith("tmux ") ? cmd.command.slice(5) : cmd.command;
      const sig = commandSignature(tmuxCmd);
      const override = keyBindings.get(sig);
      if (override) {
        return { ...cmd, shortcut: override };
      }
      return cmd;
    });
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const cmd of enrichedCommands) {
      if (!seen.has(cmd.category)) {
        seen.add(cmd.category);
        result.push(cmd.category);
      }
    }
    return result;
  }, [enrichedCommands]);

  const fuseOptions = useMemo(
    () => ({
      keys: ["id", "command", "description", "category", "benefit", "shortcut"],
      includeScore: true,
      threshold: 0.4,
    }),
    [],
  );

  const fuse = useMemo(() => new Fuse(enrichedCommands, fuseOptions), [enrichedCommands, fuseOptions]);

  const isSearching = debouncedSearchText.trim() !== "";

  const filteredCommands: TmuxCommand[] = useMemo(() => {
    const base = isSearching ? fuse.search(debouncedSearchText).map((result) => result.item) : enrichedCommands;

    if (categoryFilter === ALL_CATEGORIES) {
      return base;
    }
    return base.filter((cmd) => cmd.category === categoryFilter);
  }, [debouncedSearchText, fuse, enrichedCommands, isSearching, categoryFilter]);

  const commandsByCategory = useMemo(() => {
    const grouped = new Map<string, TmuxCommand[]>();
    for (const cmd of filteredCommands) {
      const existing = grouped.get(cmd.category);
      if (existing) {
        existing.push(cmd);
      } else {
        grouped.set(cmd.category, [cmd]);
      }
    }
    return grouped;
  }, [filteredCommands]);

  function renderCommandItem(cmd: TmuxCommand) {
    return (
      <List.Item
        key={cmd.id}
        title={cmd.id}
        subtitle={cmd.description}
        accessories={[{ text: accessoryText(cmd, prefix) }]}
        icon={cmd.icon}
        actions={
          <ActionPanel>
            <Action
              title="View Details"
              icon={Icon.Eye}
              onAction={() => push(<CommandDetail command={cmd} prefix={prefix} />)}
            />
            <Action.CopyToClipboard title="Copy Command" content={cmd.command} />
            <Action.Paste title="Paste to Terminal" content={cmd.command} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      searchBarPlaceholder="Search tmux commands..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" value={categoryFilter} onChange={setCategoryFilter}>
          <List.Dropdown.Item title="All Categories" value={ALL_CATEGORIES} />
          {categories.map((cat) => (
            <List.Dropdown.Item key={cat} title={cat} value={cat} />
          ))}
        </List.Dropdown>
      }
    >
      {isSearching
        ? filteredCommands.map(renderCommandItem)
        : Array.from(commandsByCategory.entries()).map(([category, cmds]) => (
            <List.Section
              key={category}
              title={category}
              subtitle={`${cmds.length} command${cmds.length === 1 ? "" : "s"}`}
            >
              {cmds.map(renderCommandItem)}
            </List.Section>
          ))}
    </List>
  );
}
