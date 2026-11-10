import { Icon, Image, List } from "@raycast/api";
import type { ApiSave } from "pond-api";
import type { ReactNode } from "react";
import { saveTitle, sourceName } from "../lib/display";
import type { SaveEditor } from "../lib/edits";
import type { Filter } from "../lib/filters";
import type { Lookups } from "../lib/library";
import { thumbnailKey } from "../lib/thumbnails";
import { SaveActions } from "./save-actions";
import { SaveDetail } from "./save-detail";

const KIND_ICONS = new Map<string, Image.ImageLike>([
  ["image", Icon.Image],
  ["video", Icon.FilmStrip],
  ["audio", Icon.Music],
  ["document", Icon.Document],
  ["font", Icon.Text],
  ["file", Icon.Document],
  ["link", Icon.Link],
  ["text", Icon.Text],
]);

export function kindIcon(save: ApiSave): Image.ImageLike {
  return (save.kind && KIND_ICONS.get(save.kind)) || Icon.Bookmark;
}

function saveIcon(save: ApiSave, thumbnails: ReadonlyMap<string, string | null>): Image.ImageLike {
  const path = thumbnails.get(thumbnailKey(save));
  return path ? { source: path, mask: Image.Mask.RoundedRectangle } : kindIcon(save);
}

export interface SaveItemProps {
  id?: string;
  save: ApiSave;
  editor: SaveEditor;
  lookups: Lookups;
  icons: ReadonlyMap<string, string | null>;
  preview?: string | null;
  quickLook?: { path: string; name: string };
  showingDetail: boolean;
  onToggleDetail?: () => void;
  onRefresh: () => void;
  onFilter?: (filter: Filter) => void;
  actions?: ReactNode;
}

export function SaveItem({
  id,
  save,
  editor,
  lookups,
  icons,
  preview,
  quickLook,
  showingDetail,
  onToggleDetail,
  onRefresh,
  onFilter,
  actions,
}: SaveItemProps) {
  return (
    <List.Item
      id={id ?? save.id}
      title={saveTitle(save)}
      icon={saveIcon(save, icons)}
      quickLook={quickLook}
      accessories={
        showingDetail
          ? undefined
          : [
              ...(save.tags.length
                ? [{ icon: Icon.Tag, text: String(save.tags.length), tooltip: save.tags.join(", ") }]
                : []),
              { tag: sourceName(save.source) },
              { date: new Date(save.savedAt), tooltip: `Saved ${new Date(save.savedAt).toLocaleString()}` },
            ]
      }
      detail={showingDetail ? <SaveDetail save={save} preview={preview} folders={lookups.folderById} /> : undefined}
      actions={
        <SaveActions
          save={save}
          editor={editor}
          tags={lookups.tags}
          folders={lookups.folders}
          onRefresh={onRefresh}
          onFilter={onFilter}
          onToggleDetail={onToggleDetail}
          quickLook={quickLook?.path}
        >
          {actions}
        </SaveActions>
      }
    />
  );
}
