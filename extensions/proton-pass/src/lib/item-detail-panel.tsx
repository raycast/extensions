import { Color, Detail, Icon, Image, List, open } from "@raycast/api";
import { memo } from "react";
import { monospace, totpWithCountdown } from "./format";
import { getPanelRows, PanelRow, PanelRows, PanelValue } from "./item-panel";
import { Item, ItemDetail } from "./types";
import { useTotpCode } from "./use-totp-code";
import { formatTotpCode, getItemIcon, TOTP_ICON, totpProgressIcon, totpTimerColor } from "./utils";

const MASKED_SECRET = "••••••••••••";

const ROW_ICONS: Partial<Record<string, Image.ImageLike>> = {
  username: Icon.Person,
  email: Icon.Envelope,
  password: Icon.Key,
  totp: TOTP_ICON,
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
        ? monospace(formatTotpCode(value.code))
        : {
            value: totpWithCountdown(formatTotpCode(value.code), value.remainingSeconds),
            color: totpTimerColor(value.remainingSeconds, value.period),
          };
  }
}

/** The details about the item are grayed, so that the credentials stand out without a title or separator. */
function dimmed(text: ReturnType<typeof labelText>): { value: string; color: Color } {
  return { value: typeof text === "string" ? text : text.value, color: Color.SecondaryText };
}

function renderRow(Metadata: Metadata, row: PanelRow, icon?: Image.ImageLike, isDimmed = false) {
  if (row.value.kind === "websites") {
    return (
      <Metadata.TagList key={row.id} title={row.title}>
        {row.value.websites.map((website, index) => (
          <Metadata.TagList.Item
            key={`${website.url}-${index}`}
            text={website.label}
            color={isDimmed ? Color.SecondaryText : undefined}
            onAction={() => open(website.url)}
          />
        ))}
      </Metadata.TagList>
    );
  }
  const text = labelText(row.value);
  return (
    <Metadata.Label
      key={row.id}
      title={row.title}
      text={isDimmed ? dimmed(text) : text}
      icon={isDimmed && typeof icon === "string" ? { source: icon, tintColor: Color.SecondaryText } : icon}
    />
  );
}

/** The rows of an item, shared by the details panel and the item view. */
export function renderItemMetadata(Metadata: Metadata, item: Item, rows: PanelRows, error?: string) {
  const iconOf = (row: PanelRow) => {
    // A row without a value shows its dash alone: an icon there would only add clutter.
    if (row.value.kind === "empty") return undefined;
    if (row.id === "type") return getItemIcon(item.type);
    // A circle that empties with the time the TOTP code has left, instead of the clock.
    const { value } = row;
    if (value.kind === "code" && value.remainingSeconds !== undefined && value.period) {
      return totpProgressIcon(
        value.remainingSeconds,
        value.period,
        totpTimerColor(value.remainingSeconds, value.period),
      );
    }
    return ROW_ICONS[row.id];
  };
  return (
    <Metadata>
      {rows.credentials.map((row) => renderRow(Metadata, row, iconOf(row)))}
      <Metadata.Separator />
      {rows.details.map((row) => renderRow(Metadata, row, iconOf(row), true))}
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
