import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { PveClusterOptions, PveVm, WithServer } from "@/types";
import { setVmTags } from "@/api";
import { usePveFetch } from "@/hooks/use-pve-fetch";
import { describeFetchError } from "@/utils/errors";
import { getTagColor, isValidTag, normalizeTag, parseTags } from "@/utils/tags";

type EditTagsProps = {
  vm: WithServer<PveVm>;
  onChange: () => void;
};

export const EditTags = ({ vm, onChange }: EditTagsProps) => {
  const [tags, setTags] = useState(parseTags(vm.tags));
  const [searchText, setSearchText] = useState("");
  const { data: options, isLoading } = usePveFetch<PveClusterOptions>(vm.server, "api2/json/cluster/options", {
    timerInterval: null,
  });

  const knownTags = [...new Set([...(options?.["allowed-tags"] ?? []), ...tags])].sort();
  const otherTags = knownTags.filter((tag) => !tags.includes(tag));
  const newTag = normalizeTag(searchText);
  const canCreate = isValidTag(newTag) && !knownTags.includes(newTag);

  const save = async (next: string[], message: string) => {
    const toast = await showToast({ title: "Saving tags", message, style: Toast.Style.Animated });
    try {
      await setVmTags(vm, next);
    } catch (e) {
      await showFailureToast(e, { title: `Failed to save the tags of ${vm.name}`, message: describeFetchError(e) });
      return;
    }

    setTags(next);
    setSearchText("");
    onChange();
    toast.style = Toast.Style.Success;
    toast.title = "Saved tags";
  };

  const renderTag = (tag: string, active: boolean) => (
    <List.Item
      key={tag}
      title={tag}
      icon={{ source: Icon.Tag, tintColor: getTagColor(tag) }}
      accessories={active ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green } }] : []}
      actions={
        <ActionPanel>
          {active ? (
            <Action
              title="Remove Tag"
              icon={Icon.Minus}
              onAction={() =>
                save(
                  tags.filter((t) => t !== tag),
                  `Removing ${tag}`,
                )
              }
            />
          ) : (
            <Action title="Add Tag" icon={Icon.Plus} onAction={() => save([...tags, tag].sort(), `Adding ${tag}`)} />
          )}
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Tags of ${vm.name}`}
      searchBarPlaceholder="Search or create a tag"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
    >
      {canCreate && (
        <List.Item
          title={`Create "${newTag}"`}
          icon={{ source: Icon.PlusCircle, tintColor: getTagColor(newTag) }}
          keywords={[searchText]}
          actions={
            <ActionPanel>
              <Action
                title="Create Tag"
                icon={Icon.Plus}
                onAction={() => save([...tags, newTag].sort(), `Adding ${newTag}`)}
              />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="On This VM">{tags.map((tag) => renderTag(tag, true))}</List.Section>
      <List.Section title="Available">{otherTags.map((tag) => renderTag(tag, false))}</List.Section>
    </List>
  );
};
