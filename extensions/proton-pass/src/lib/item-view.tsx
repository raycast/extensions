import { Detail } from "@raycast/api";
import { escapeMarkdown, noteToMarkdown } from "./format";
import { ItemActions } from "./item-actions";
import { renderItemMetadata } from "./item-detail-panel";
import { ItemDetailStore, useItemDetail } from "./item-detail-store";
import { getPanelRows } from "./item-panel";
import { Item } from "./types";
import { useTotpCode } from "./use-totp-code";

interface ItemViewProps {
  item: Item;
  store: ItemDetailStore;
  onUse: (item: Item) => void;
}

/** An item in its own view (View Details): the rows of the details panel, beside the title and the full note. */
export function ItemView({ item, store, onUse }: ItemViewProps) {
  const { detail, error, isLoading } = useItemDetail(store, item);
  const { code: totp, failed: totpFailed } = useTotpCode(item, detail);
  const rows = getPanelRows({ item, detail, totp, totpFailed, isLoading, error });
  const note = detail?.note;
  const markdown = [`# ${escapeMarkdown(item.title)}`, note ? noteToMarkdown(note) : undefined]
    .filter((part) => part !== undefined)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={item.title}
      isLoading={isLoading}
      markdown={markdown}
      // The note is shown in full beside the rows, so its masked row would only repeat it.
      metadata={renderItemMetadata(
        Detail.Metadata,
        item,
        { ...rows, fields: rows.fields.filter((row) => row.id !== "note") },
        error,
      )}
      actions={<ItemActions item={item} detail={detail} store={store} onUse={onUse} />}
    />
  );
}
