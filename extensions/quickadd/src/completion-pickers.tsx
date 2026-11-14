import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { type CurrentNote, noteItems } from "./lib/current-note";
import {
  type LinkItem,
  type TagItem,
  suggestLinks,
  suggestTags,
} from "./lib/suggest";
import type { ChoiceSummary } from "./lib/types";
import type { Vault } from "./lib/vaults";

interface PickerProps<T> {
  vault: Vault;
  onPick: (item: T) => void;
  onClose: () => void;
}

function linkLabel(item: LinkItem): { title: string; subtitle: string } {
  if (item.alias) return { title: item.alias, subtitle: item.path };
  const slash = item.path.lastIndexOf("/");
  return {
    title: item.path.slice(slash + 1).replace(/\.md$/, ""),
    subtitle: slash < 0 ? "" : item.path.slice(0, slash),
  };
}

export function LinkPicker({ vault, onPick, onClose }: PickerProps<LinkItem>) {
  useEffect(() => onClose, []);
  const { data, isLoading, error } = usePromise(suggestLinks, [vault], {
    onError: () => {},
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search notes">
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load notes"
          description={error.message}
        />
      )}
      {data?.map((item, index) => (
        <List.Item
          key={`${item.text}-${index}`}
          icon={Icon.Document}
          {...linkLabel(item)}
          keywords={[item.path, item.text]}
          actions={
            <ActionPanel>
              <Action
                title="Insert Link"
                icon={Icon.Link}
                onAction={() => onPick(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function TagPicker({ vault, onPick, onClose }: PickerProps<TagItem>) {
  useEffect(() => onClose, []);
  const { data, isLoading, error } = usePromise(suggestTags, [vault], {
    onError: () => {},
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags">
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load tags"
          description={error.message}
        />
      )}
      {data?.map((item, index) => (
        <List.Item
          key={`${item.tag}-${index}`}
          icon={Icon.Tag}
          title={`#${item.tag}`}
          accessories={[{ text: String(item.count) }]}
          actions={
            <ActionPanel>
              <Action
                title="Insert Tag"
                icon={Icon.Tag}
                onAction={() => onPick(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function suggestNotes(vault: Vault): Promise<LinkItem[]> {
  return noteItems(await suggestLinks(vault));
}

export function CurrentNotePicker({
  vault,
  choice,
  onPick,
}: {
  vault: Vault;
  choice: Pick<ChoiceSummary, "name" | "currentNote">;
  onPick: (current: CurrentNote) => void;
}) {
  // A toast, because the "No current note" row would hide an empty view.
  const { data, isLoading } = usePromise(suggestNotes, [vault], {
    onError: (error) => {
      void showFailureToast(error, { title: "Could not load notes" });
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Current Note for ${choice.name}`}
      searchBarPlaceholder="Search notes"
    >
      {choice.currentNote === "optional" && (
        <List.Section>
          <List.Item
            icon={Icon.Circle}
            title="No current note"
            subtitle={`${choice.name} runs without linking to or reading from a note`}
            actions={
              <ActionPanel>
                <Action
                  title="Run Without a Current Note"
                  icon={Icon.Play}
                  onAction={() => onPick("none")}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Notes">
        {data?.map((item) => (
          <List.Item
            key={item.path}
            icon={Icon.Document}
            {...linkLabel(item)}
            keywords={[item.path]}
            actions={
              <ActionPanel>
                <Action
                  title="Run with This Note"
                  icon={Icon.Play}
                  onAction={() => onPick(item.path)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
