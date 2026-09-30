import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { loadTags, VaultRef } from "../suggestions";

/** Searchable list of the vault's tags (from Obsidian's index), shown when `#` starts a word. */
export default function TagPicker({
  vault,
  onPick,
  onClose,
}: {
  vault: VaultRef;
  onPick: (tag: string) => void;
  /** Called when the picker goes away, whether something was picked or Esc was pressed. */
  onClose: () => void;
}) {
  const [tags, setTags] = useState<{ tag: string; count: number }[] | undefined>(undefined);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    loadTags(vault).then((loaded) => {
      if (active) setTags(loaded);
    });
    return () => {
      active = false;
      onClose();
    };
  }, []);

  const typed = search.trim().replace(/^#/, "").replace(/\s+/g, "-");
  const isNew = typed !== "" && !(tags ?? []).some((entry) => entry.tag.toLowerCase() === typed.toLowerCase());

  return (
    <List
      isLoading={tags === undefined}
      navigationTitle="Add Tag"
      searchBarPlaceholder="Search tags"
      onSearchTextChange={setSearch}
      filtering={{ keepSectionOrder: true }}
    >
      <List.EmptyView icon={Icon.Hashtag} title="No tags yet" description="Type a tag name to add a new one." />
      <List.Section title="Tags">
        {(tags ?? []).map((entry) => (
          <List.Item
            key={entry.tag}
            title={`#${entry.tag}`}
            icon={Icon.Hashtag}
            accessories={[{ text: String(entry.count) }]}
            actions={
              <ActionPanel>
                <Action title="Insert Tag" icon={Icon.Hashtag} onAction={() => onPick(entry.tag)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {isNew ? (
        <List.Section title="New Tag">
          <List.Item
            key="new"
            title={`Use “#${typed}”`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action title="Insert New Tag" icon={Icon.Plus} onAction={() => onPick(typed)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
