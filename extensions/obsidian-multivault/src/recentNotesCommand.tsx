import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import { useObsidianVaults } from "./utils/hooks";
import { NoVaultFoundMessage } from "./components/Notifications/NoVaultFoundMessage";
import { useEffect, useState } from "react";
import {
  EnhancedVault,
  enhanceVaults,
  getVaultDisplayName,
} from "./utils/vault-config";
import { loadNotes } from "./api/vault/vault.service";
import { Note } from "./api/vault/notes/notes.types";
import { NoteQuickLook } from "./components/NoteQuickLook";
import { NoteActions } from "./utils/actions";
import { GlobalPreferences } from "./utils/preferences";
import {
  getVaultIndicators,
  useVaultIndicatorStyle,
} from "./components/VaultIndicator";
import { setActiveVault } from "./utils/vault-context";

interface NoteWithVault {
  note: Note;
  vault: EnhancedVault;
}

type TimeFilter = "all" | "24h" | "7d" | "30d";

export default function Command() {
  const { vaults, ready } = useObsidianVaults();
  const preferences = getPreferenceValues<GlobalPreferences>();
  const indicatorStyle = useVaultIndicatorStyle(preferences);

  const [enhancedVaults, setEnhancedVaults] = useState<EnhancedVault[]>([]);
  const [notesWithVaults, setNotesWithVaults] = useState<NoteWithVault[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteWithVault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");
  const [groupByVault, setGroupByVault] = useState(false);

  useEffect(() => {
    async function loadAllNotes() {
      if (!ready || vaults.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Enhance vaults with metadata
      const enhanced = await enhanceVaults(vaults);
      setEnhancedVaults(enhanced);

      // Load notes from all vaults
      const allNotes: NoteWithVault[] = [];

      for (const vault of enhanced) {
        try {
          const notes = loadNotes(vault);
          for (const note of notes) {
            allNotes.push({ note, vault });
          }
        } catch (error) {
          console.error(`Failed to load notes from ${vault.name}:`, error);
        }
      }

      // Sort by last modified (most recent first)
      allNotes.sort(
        (a, b) => b.note.lastModified.getTime() - a.note.lastModified.getTime()
      );

      setNotesWithVaults(allNotes);
      setFilteredNotes(filterNotesByTime(allNotes, timeFilter));
      setIsLoading(false);
    }

    loadAllNotes();
  }, [ready, vaults]);

  useEffect(() => {
    setFilteredNotes(filterNotesByTime(notesWithVaults, timeFilter));
  }, [timeFilter, notesWithVaults]);

  function filterNotesByTime(
    notes: NoteWithVault[],
    filter: TimeFilter
  ): NoteWithVault[] {
    if (filter === "all") {
      return notes;
    }

    const now = new Date();
    let cutoffTime = now.getTime();

    switch (filter) {
      case "24h":
        cutoffTime = now.getTime() - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        cutoffTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        cutoffTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return notes.filter((nv) => nv.note.lastModified.getTime() >= cutoffTime);
  }

  function getTimeFilterDropdown() {
    return (
      <List.Dropdown
        tooltip="Filter by Time"
        value={timeFilter}
        onChange={(newValue) => setTimeFilter(newValue as TimeFilter)}
      >
        <List.Dropdown.Item title="Last 24 Hours" value="24h" />
        <List.Dropdown.Item title="Last 7 Days" value="7d" />
        <List.Dropdown.Item title="Last 30 Days" value="30d" />
        <List.Dropdown.Item title="All Time" value="all" />
      </List.Dropdown>
    );
  }

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return "Just now";
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      const weeks = Math.floor(days / 7);
      if (weeks < 4) {
        return `${weeks}w ago`;
      } else {
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
      }
    }
  }

  async function handleSetActiveVault(vaultKey: string) {
    await setActiveVault(vaultKey);
  }

  function renderNoteItem(noteWithVault: NoteWithVault) {
    const { note, vault } = noteWithVault;
    const indicators = getVaultIndicators(
      vault,
      indicatorStyle,
      getRelativeTime(note.lastModified),
      note.tags.length > 0
        ? [
            {
              tag: { value: note.tags[0], color: Color.SecondaryText },
              tooltip: note.tags.join(", "),
            },
          ]
        : undefined
    );

    // Get all notes for this vault for NoteActions
    const vaultNotes = filteredNotes
      .filter((nv) => nv.vault.key === vault.key)
      .map((nv) => nv.note);

    return (
      <List.Item
        key={`${vault.key}-${note.path}`}
        title={note.title}
        subtitle={indicators.subtitle}
        accessories={indicators.accessories}
        icon={{ fileIcon: note.path }}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Quick Look"
                icon={Icon.Eye}
                target={
                  <NoteQuickLook
                    note={note}
                    vault={vault}
                    showTitle={true}
                    allNotes={vaultNotes}
                  />
                }
              />
              <NoteActions note={note} notes={vaultNotes} vault={vault} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Set as Active Vault"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "a" }}
                onAction={() => handleSetActiveVault(vault.key)}
              />
              <Action
                title={groupByVault ? "Show as Unified List" : "Group by Vault"}
                icon={Icon.AppWindowList}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                onAction={() => setGroupByVault(!groupByVault)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  if (!ready || isLoading) {
    return (
      <List isLoading={true} searchBarAccessory={getTimeFilterDropdown()} />
    );
  }

  if (vaults.length === 0) {
    return <NoVaultFoundMessage />;
  }

  if (groupByVault) {
    // Group notes by vault
    const notesByVault = new Map<string, NoteWithVault[]>();

    for (const nv of filteredNotes) {
      const vaultKey = nv.vault.key;
      if (!notesByVault.has(vaultKey)) {
        notesByVault.set(vaultKey, []);
      }
      notesByVault.get(vaultKey)!.push(nv);
    }

    return (
      <List
        searchBarPlaceholder="Search recent notes..."
        searchBarAccessory={getTimeFilterDropdown()}
      >
        {Array.from(notesByVault.entries()).map(([vaultKey, notes]) => {
          const vault = enhancedVaults.find((v) => v.key === vaultKey);
          if (!vault) return null;

          return (
            <List.Section
              key={vaultKey}
              title={getVaultDisplayName(vault)}
              subtitle={`${notes.length} note${notes.length !== 1 ? "s" : ""}`}
            >
              {notes.map((nv) => renderNoteItem(nv))}
            </List.Section>
          );
        })}
      </List>
    );
  }

  // Unified list
  return (
    <List
      searchBarPlaceholder="Search recent notes..."
      searchBarAccessory={getTimeFilterDropdown()}
    >
      <List.Section
        title="Recent Notes"
        subtitle={`${filteredNotes.length} note${
          filteredNotes.length !== 1 ? "s" : ""
        }`}
      >
        {filteredNotes.map((nv) => renderNoteItem(nv))}
      </List.Section>
    </List>
  );
}
