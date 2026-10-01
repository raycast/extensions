import { Color, Detail, Icon, Image, List, open } from "@raycast/api";
import { memo } from "react";
import { getPanelRows, PanelRow, PanelRows, PanelValue } from "./item-panel";
import { Item, ItemDetail } from "./types";
import { useTotpCode } from "./use-totp-code";
import { formatTotpCode, getItemIcon } from "./utils";

const MASKED_SECRET = "••••••••••••";

const ROW_ICONS: Partial<Record<string, Image.ImageLike>> = {
  username: Icon.Person,
  email: Icon.Envelope,
  password: Icon.Key,
  totp: Icon.Clock,
  note: Icon.Document,
  vault: Icon.Folder,
  modified: Icon.Calendar,
};

/** Detail.Metadata and List.Item.Detail.Metadata are the same component. */
type Metadata = typeof Detail.Metadata;

function labelText(value: Exclude<PanelValue, { kind: "websites" }>): string | { value: string; color?: Color } {
  switch (value.kind) {
    case "text":
      return value.text;
    case "masked":
      return MASKED_SECRET;
    case "empty":
      return { value: "—", color: Color.SecondaryText };
    case "loading":
      return { value: "Loading…", color: Color.SecondaryText };
    case "unavailable":
      return { value: "Unavailable", color: Color.SecondaryText };
    case "code":
      return value.remainingSeconds === undefined
        ? formatTotpCode(value.code)
        : {
            value: `${formatTotpCode(value.code)}  ·  ${value.remainingSeconds}s`,
            color: value.remainingSeconds <= 5 ? Color.Orange : undefined,
          };
  }
}

function renderRow(Metadata: Metadata, row: PanelRow, icon?: Image.ImageLike) {
  if (row.value.kind === "websites") {
    return (
      <Metadata.TagList key={row.id} title={row.title}>
        {row.value.websites.map((website, index) => (
          <Metadata.TagList.Item
            key={`${website.url}-${index}`}
            text={website.label}
            onAction={() => open(website.url)}
          />
        ))}
      </Metadata.TagList>
    );
  }
  return <Metadata.Label key={row.id} title={row.title} text={labelText(row.value)} icon={icon} />;
}

/** The rows of an item, shared by the details panel and the item view. */
export function renderItemMetadata(Metadata: Metadata, item: Item, rows: PanelRows, error?: string) {
  const iconOf = (row: PanelRow) => (row.id === "type" ? getItemIcon(item.type) : ROW_ICONS[row.id]);
  return (
    <Metadata>
      {rows.fields.map((row) => renderRow(Metadata, row, iconOf(row)))}
      <Metadata.Separator />
      {rows.metadata.map((row) => renderRow(Metadata, row, iconOf(row)))}
      {rows.customFields.length > 0 && <Metadata.Separator />}
      {rows.customFields.map((row) => renderRow(Metadata, row))}
      {error && (
        <Metadata.Label
          title="Error"
          text={{ value: `Couldn't load details: ${error.split("\n")[0]}`, color: Color.Red }}
          icon={Icon.ExclamationMark}
        />
      )}
    </Metadata>
  );
}

interface ItemDetailPanelProps {
  item: Item;
  detail?: ItemDetail;
  isLoading: boolean;
  error?: string;
}

export const ItemDetailPanel = memo(function ItemDetailPanel({ item, detail, isLoading, error }: ItemDetailPanelProps) {
  const { code: totp, failed: totpFailed } = useTotpCode(item, detail);
  const rows = getPanelRows({ item, detail, totp, totpFailed, isLoading, error });
  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={renderItemMetadata(List.Item.Detail.Metadata, item, rows, error)}
    />
  );
});
