import { Detail } from "@raycast/api";
import { useItemPreview, ItemMetadata, ItemActions } from "$lib/components/item";
import type { ItemDetailProps } from "./types";

export function ItemDetail({
  entry,
  directoryTarget,
  symlinkDirectoryTarget,
  editTarget,
  tagCatalog,
  onTrashItems,
  revalidate,
}: ItemDetailProps) {
  const preview = useItemPreview(entry);

  return (
    <Detail
      navigationTitle={entry.name}
      markdown={preview}
      metadata={<ItemMetadata entry={entry} tagCatalog={tagCatalog} />}
      actions={
        <ItemActions
          entry={entry}
          directoryTarget={directoryTarget}
          symlinkDirectoryTarget={symlinkDirectoryTarget}
          editTarget={editTarget}
          onTrashItems={onTrashItems}
          revalidate={revalidate}
        />
      }
    />
  );
}
