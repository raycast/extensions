import { List, Grid, getPreferenceValues, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

import { useItemList, useThumbnail } from "./utils/query";
import EagleItem from "./components/EagleItem";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";
import { Item } from "./@types/eagle";
import { ItemDetail } from "./components/ItemDetail";
import { FolderNavigationActions } from "./components/FolderNavigationActions";
import { MoveToTrashAction } from "./components/MoveToTrashAction";
import { EditItemTagsAction } from "./components/EditItemTagsAction";
import { EditItemAnnotationAction } from "./components/EditItemAnnotationAction";

interface Preferences {
  layout: "list" | "grid";
}

function GridEagleItem({ item, onUpdate }: { item: Item; onUpdate?: () => void }) {
  const { data: thumbnail } = useThumbnail(item.id);

  // Convert file:// URL back to regular path
  const filePath = thumbnail ? decodeURIComponent(thumbnail.replace("file://", "")) : undefined;

  return (
    <Grid.Item
      content={filePath ? { source: filePath } : { source: Icon.Document }}
      title={item.name}
      actions={
        <ActionPanel>
          <Action.Push target={<ItemDetail item={item} />} title="View Detail" icon={Icon.Eye} />
          <FolderNavigationActions item={item} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          {!item.isDeleted && (
            <>
              <ActionPanel.Section title="Edit">
                <EditItemTagsAction item={item} onUpdate={onUpdate} />
                <EditItemAnnotationAction item={item} onUpdate={onUpdate} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <MoveToTrashAction item={item} onUpdate={onUpdate} />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Index() {
  const [search, setSearch] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  const { isLoading, data: items = [], error, revalidate } = useItemList(search);

  checkEagleInstallation();

  if (error && "code" in error && error.code === "ECONNREFUSED") {
    showEagleNotOpenToast();
  } else if (error) {
    console.error(error);
  }

  if (preferences.layout === "grid") {
    return (
      <Grid onSearchTextChange={setSearch} isLoading={isLoading}>
        {items.map((item) => (
          <GridEagleItem key={item.id} item={item} onUpdate={revalidate} />
        ))}
      </Grid>
    );
  }

  return (
    <List isShowingDetail onSearchTextChange={setSearch} isLoading={isLoading}>
      {items.map((item) => (
        <EagleItem key={item.id} item={item} onUpdate={revalidate} />
      ))}
    </List>
  );
}
