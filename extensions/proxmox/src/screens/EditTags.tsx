import { useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { PveClusterOptions, PveVm, WithServer } from "@/types";
import { editVmTags } from "@/api";
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

  // Each save reads the VM's current tags first, so we run saves one at a time to let each one
  // see the result of the previous one.
  const saveQueue = useRef(Promise.resolve());

  const applyEdit = async (edit: (current: string[]) => string[], message: string) => {
    const toast = await showToast({ title: "Saving tags", message, style: Toast.Style.Animated });
    let next: string[];
    try {
      next = await editVmTags(vm, edit);
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

  const save = (edit: (current: string[]) => string[], message: string) => {
    saveQueue.current = saveQueue.current.then(() => applyEdit(edit, message));
  };

  const addTag = (tag: string) => save((current) => [...new Set([...current, tag])].sort(), `Adding ${tag}`);
  const removeTag = (tag: string) => save((current) => current.filter((t) => t !== tag), `Removing ${tag}`);

  const renderTag = (tag: string, active: boolean) => (
    <List.Item
      key={tag}
      title={tag}
      icon={{ source: Icon.Tag, tintColor: getTagColor(tag) }}
      accessories={active ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green } }] : []}
      actions={
        <ActionPanel>
          {active ? (
            <Action title="Remove Tag" icon={Icon.Minus} onAction={() => removeTag(tag)} />
          ) : (
            <Action title="Add Tag" icon={Icon.Plus} onAction={() => addTag(tag)} />
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
              <Action title="Create Tag" icon={Icon.Plus} onAction={() => addTag(newTag)} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="On This VM">{tags.map((tag) => renderTag(tag, true))}</List.Section>
      <List.Section title="Available">{otherTags.map((tag) => renderTag(tag, false))}</List.Section>
    </List>
  );
};
