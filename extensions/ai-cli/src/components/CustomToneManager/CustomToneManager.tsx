import { useCallback, useMemo, useState } from "react";
import { List, useNavigation } from "@raycast/api";
import { CustomTone, useCustomTones } from "@/hooks/useCustomTones";
import ToneForm from "./components/ToneForm";
import CreateEntityAction from "../shared/CreateEntityAction";
import ToneListItem from "./components/ToneListItem";
import { messages } from "@/locale/en/messages";
import { createTempTone, filterTones, getTonesCountMessage, handleToneDeletion } from "./CustomToneManager.helpers";
import { shouldShowEmptyView } from "@/utils/entity-list-helpers";

export default function CustomToneManager() {
  const { tones, isLoading, addTone, updateTone, deleteTone } = useCustomTones();
  const { push, pop } = useNavigation();
  const [searchText, setSearchText] = useState("");

  const filteredTones = useMemo(() => {
    return filterTones(tones, searchText);
  }, [tones, searchText]);

  const handleDelete = useCallback(
    async (tone: CustomTone) => {
      await handleToneDeletion(tone, deleteTone);
    },
    [deleteTone]
  );

  const navigationCallbacks = useMemo(
    () => ({
      onSuccess: () => pop(),
      onCancel: () => pop(),
      onCreate: addTone,
      onUpdate: updateTone,
      onDelete: handleDelete,
    }),
    [pop, addTone, updateTone, handleDelete]
  );

  const handleEdit = useCallback(
    (tone: CustomTone) => {
      push(<ToneForm tone={tone} {...navigationCallbacks} />);
    },
    [push, navigationCallbacks]
  );

  const handleCreate = useCallback(() => {
    const tempTone = createTempTone();
    push(<ToneForm tone={tempTone} {...navigationCallbacks} />);
  }, [push, navigationCallbacks]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={messages.search.tonesPlaceholder}
      navigationTitle={messages.management.navigationTitle.customTones}
      actions={<CreateEntityAction title={messages.management.createNewTone} onAction={handleCreate} wrapInPanel />}
    >
      <List.Section title={getTonesCountMessage(filteredTones.length)}>
        {filteredTones.map((tone) => (
          <ToneListItem key={tone.id} tone={tone} onEdit={handleEdit} onDelete={handleDelete} onCreate={handleCreate} />
        ))}
      </List.Section>

      {shouldShowEmptyView(filteredTones, isLoading) && (
        <List.EmptyView
          title={messages.management.noTonesFound}
          description={messages.management.createFirstTone}
          actions={<CreateEntityAction title={messages.management.createNewTone} onAction={handleCreate} wrapInPanel />}
        />
      )}
    </List>
  );
}
