import { Contents } from "$lib/components/contents";
import type { ContentsSection } from "$lib/components/contents/types";
import { isNavigableDirectory } from "$lib/item-behavior";
import { ItemDetail } from "$lib/pages/item-detail";
import { ItemEdit } from "$lib/pages/item-edit";
import { resolveSymlink } from "$lib/symlink-resolve";
import type { Item } from "$lib/types";
import type { ItemBrowserPresenterProps, ItemBrowserSectionBuilderProps } from "./types";

export function buildItemBrowserSections<TItem extends Item>({
  items,
  renderItem,
}: ItemBrowserSectionBuilderProps<TItem>): ContentsSection[] {
  const folders = items.filter((item) => isNavigableDirectory(item));
  const files = items.filter((item) => !isNavigableDirectory(item));

  const sections: ContentsSection[] = [];

  if (folders.length > 0) {
    sections.push({
      title: "Folders",
      subtitle: String(folders.length),
      children: folders.map(renderItem),
    });
  }

  if (files.length > 0) {
    sections.push({
      title: "Files",
      subtitle: String(files.length),
      children: files.map(renderItem),
    });
  }

  return sections;
}

export function ItemBrowserPresenter({
  items,
  view,
  onViewChange,
  sort,
  onSortChange,
  gridColumns,
  enabledAccessories,
  enterAction,
  isLoading,
  pathLabel,
  emptyTitle,
  emptyDescription,
  actions,
  tagCatalog = [],
  createDirectoryTarget,
  createItemActionCallbacks,
}: ItemBrowserPresenterProps) {
  const sections = buildItemBrowserSections({
    items,
    renderItem: (entry) => {
      const itemActionCallbacks = createItemActionCallbacks?.(entry) ?? {};
      const isDirectory = isNavigableDirectory(entry);
      const resolvedSymlink = entry.type === "symlink" ? resolveSymlink(entry.path) : null;
      const symlinkTargetPath = resolvedSymlink?.targetIsDirectory ? resolvedSymlink.resolvedPath : null;

      const buildDirectoryTarget = () => (isDirectory ? createDirectoryTarget(entry.path) : undefined);
      const buildSymlinkDirectoryTarget = () =>
        symlinkTargetPath ? createDirectoryTarget(symlinkTargetPath) : undefined;
      const buildEditTarget = () => (
        <ItemEdit
          entry={entry}
          directoryTarget={buildDirectoryTarget()}
          symlinkDirectoryTarget={buildSymlinkDirectoryTarget()}
          siblingDirectories={itemActionCallbacks.siblingDirectories}
          onApplied={itemActionCallbacks.onApplied}
          onCreateFolder={itemActionCallbacks.onCreateFolder}
          onCopyItem={itemActionCallbacks.onCopyItem}
          onMoveItem={itemActionCallbacks.onMoveItem}
        />
      );

      return (
        <Contents.Item
          key={entry.path}
          entry={entry}
          enabledAccessories={enabledAccessories}
          totalEntries={items.length}
          tagCatalog={tagCatalog}
          actions={
            <Contents.ItemActionPanel
              type={entry.type}
              path={entry.path}
              enterAction={enterAction}
              onCreateFolder={itemActionCallbacks.onCreateFolder}
              onCopyItem={itemActionCallbacks.onCopyItem}
              onMoveItem={itemActionCallbacks.onMoveItem}
              siblingDirectories={itemActionCallbacks.siblingDirectories}
              onTrashItems={itemActionCallbacks.onTrashItems}
              revalidate={itemActionCallbacks.revalidate}
              target={buildDirectoryTarget()}
              symlinkDirectoryTarget={buildSymlinkDirectoryTarget()}
              detail={
                <ItemDetail
                  entry={entry}
                  tagCatalog={tagCatalog}
                  directoryTarget={buildDirectoryTarget()}
                  symlinkDirectoryTarget={buildSymlinkDirectoryTarget()}
                  onTrashItems={itemActionCallbacks.onTrashItems}
                  revalidate={itemActionCallbacks.revalidate}
                  editTarget={buildEditTarget()}
                />
              }
              edit={buildEditTarget()}
            />
          }
        />
      );
    },
  });

  return (
    <Contents
      view={view}
      path={pathLabel}
      counts={items.length}
      isLoading={isLoading}
      searchBarAccessory={
        <Contents.Dropdown view={view} sort={sort} onViewChange={onViewChange} onSortChange={onSortChange} />
      }
      columns={gridColumns}
      sections={sections}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      actions={actions}
    />
  );
}

export type {
  ItemBrowserDirectoryTargetFactory,
  ItemBrowserItemActionCallbacks,
  ItemBrowserItemActionCallbacksFactory,
  ItemBrowserPresenterProps,
  ItemBrowserSectionBuilderProps,
} from "./types";
