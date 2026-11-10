import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { t } from "../utils/i18n";
import { getFolderBySlot } from "../utils/storage";
import { AppGrid } from "./AppGrid";
import { CreateFolderForm } from "./CreateFolderForm";

interface SlotFolderCommandProps {
  slot: number;
}

/**
 * Component for opening an app folder assigned to a specific shortcut slot.
 */
export function SlotFolderCommand({ slot }: SlotFolderCommandProps) {
  const {
    data: folder,
    isLoading,
    revalidate,
  } = usePromise((targetSlot: number) => getFolderBySlot(targetSlot), [slot]);

  if (isLoading) {
    return <Grid isLoading={true} />;
  }

  if (!folder) {
    return (
      <Grid searchBarPlaceholder={t.emptySlotTitle(slot)}>
        <Grid.EmptyView
          icon={{ source: "glass_folder.png" }}
          title={t.emptySlotTitle(slot)}
          description={t.emptySlotDesc}
          actions={
            <ActionPanel>
              <Action.Push
                title={t.createSlotFolder(slot)}
                icon={Icon.Plus}
                target={
                  <CreateFolderForm
                    onFolderCreated={revalidate}
                    defaultSlot={slot}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return <AppGrid folder={folder} onUpdateFolder={revalidate} />;
}
