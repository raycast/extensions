import React from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { STATUS_GROUPS, useAddNewTask, useStore } from "@today/common";
import { AutocompleteReturn } from "@today/common/hooks/useAddNewTask/types";
import { ICONS } from "./TaskItem/constants";

type AutoCompleteItemProps = {
  index: number;
  item: AutocompleteReturn["results"][0];
  onSelect: AutocompleteReturn["onSelect"];
};

const AutoCompleteItem = ({ item, onSelect, index }: AutoCompleteItemProps) => {
  const { setItem } = useStore();

  React.useEffect(() => {
    if (index) return;

    setItem("selectedItem", item.itemId);
  }, [setItem, index, item.itemId]);

  return (
    <List.Item
      id={item.itemId}
      key={item.id}
      title={item.value}
      icon={item.id ? ICONS[item.id as STATUS_GROUPS] : undefined}
      actions={
        <ActionPanel title="#1 in raycast/extensions">
          <Action title="Select Database" onAction={() => onSelect(item.id)} />
        </ActionPanel>
      }
    />
  );
};

type Props = {
  autocompletes: ReturnType<typeof useAddNewTask>["autocompletes"];
};

export const AutoCompleteList = ({ autocompletes }: Props) => {
  return Object.entries(autocompletes).map(([key, autocomplete]) =>
    autocomplete.results.length ? (
      <List.Section key={key} title={autocomplete.label}>
        {autocomplete.results.map((result, index) => (
          <AutoCompleteItem key={result.id} index={index} item={result} onSelect={autocomplete.onSelect} />
        ))}
      </List.Section>
    ) : null,
  );
};
