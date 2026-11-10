import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Folder } from "../types";
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
  const [folder, setFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    try {
      const data = await getFolderBySlot(slot);
      setFolder(data || null);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: t.errorTitle,
        message: t.loadFoldersError,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slot]);

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
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <CreateFolderForm
                    onFolderCreated={loadData}
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

  return <AppGrid folder={folder} onUpdateFolder={loadData} />;
}
