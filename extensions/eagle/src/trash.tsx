import { List, Grid, getPreferenceValues } from "@raycast/api";
import { useTrashItemList } from "./utils/query";
import EagleItem from "./components/EagleItem";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";
import { Item } from "./@types/eagle";
import { ItemDetail } from "./components/ItemDetail";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { useThumbnail } from "./utils/query";

interface Preferences {
  layout: "list" | "grid";
}

function GridEagleItem({ item }: { item: Item }) {
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
        </ActionPanel>
      }
    />
  );
}

export default function Trash() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, data: items = [], error, revalidate } = useTrashItemList();

  checkEagleInstallation();

  if (error && "code" in error && error.code === "ECONNREFUSED") {
    showEagleNotOpenToast();
  } else if (error) {
    console.error(error);
  }

  if (preferences.layout === "grid") {
    return (
      <Grid isLoading={isLoading}>
        {items.map((item) => (
          <GridEagleItem key={item.id} item={item} />
        ))}
      </Grid>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {items.map((item) => (
        <EagleItem key={item.id} item={item} onTrash={revalidate} />
      ))}
    </List>
  );
}
