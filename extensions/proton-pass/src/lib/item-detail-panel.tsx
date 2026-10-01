import { Color, Icon, Image, List, open } from "@raycast/api";
import { memo } from "react";
import { getPanelRows, PanelRow, PanelValue } from "./item-panel";
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

function renderRow(row: PanelRow, icon?: Image.ImageLike) {
  if (row.value.kind === "websites") {
    return (
      <List.Item.Detail.Metadata.TagList key={row.id} title={row.title}>
        {row.value.websites.map((website, index) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={`${website.url}-${index}`}
            text={website.label}
            onAction={() => open(website.url)}
          />
        ))}
      </List.Item.Detail.Metadata.TagList>
    );
  }
  return <List.Item.Detail.Metadata.Label key={row.id} title={row.title} text={labelText(row.value)} icon={icon} />;
}

interface ItemDetailPanelProps {
  item: Item;
  detail?: ItemDetail;
  isLoading: boolean;
  error?: string;
}

export const ItemDetailPanel = memo(function ItemDetailPanel({ item, detail, isLoading, error }: ItemDetailPanelProps) {
  const totp = useTotpCode(item, detail);
  const { fields, metadata, customFields } = getPanelRows({ item, detail, totp, isLoading, error });
  const iconOf = (row: PanelRow) => (row.id === "type" ? getItemIcon(item.type) : ROW_ICONS[row.id]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          {fields.map((row) => renderRow(row, iconOf(row)))}
          <List.Item.Detail.Metadata.Separator />
          {metadata.map((row) => renderRow(row, iconOf(row)))}
          {customFields.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {customFields.map((row) => renderRow(row))}
          {error && (
            <List.Item.Detail.Metadata.Label
              title="Error"
              text={{ value: `Couldn't load details: ${error.split("\n")[0]}`, color: Color.Red }}
              icon={Icon.ExclamationMark}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
});
