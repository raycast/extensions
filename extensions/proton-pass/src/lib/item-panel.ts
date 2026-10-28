import { formatRelativeTime, formatTypeLabel, toOpenableUrl, websiteLabels } from "./format";
import { Item, ItemDetail } from "./types";

export type PanelValue =
  | { kind: "text"; text: string }
  | { kind: "masked" }
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "code"; code: string; remainingSeconds?: number }
  | { kind: "websites"; websites: { label: string; url: string }[] };

export interface PanelRow {
  id: string;
  title: string;
  value: PanelValue;
}

export interface PanelRows {
  fields: PanelRow[];
  metadata: PanelRow[];
  customFields: PanelRow[];
}

export interface PanelInput {
  item: Item;
  /** Loaded details of the item, when it's selected. */
  detail?: ItemDetail;
  totp?: { code: string; remainingSeconds?: number };
  /** The 2FA code couldn't be fetched. */
  totpFailed?: boolean;
  isLoading: boolean;
  error?: string;
  now?: number;
}

const EMPTY: PanelValue = { kind: "empty" };
const MASKED: PanelValue = { kind: "masked" };

function text(value: string | undefined): PanelValue {
  return value ? { kind: "text", text: value } : EMPTY;
}

/**
 * Rows of the item details panel. Every item gets the same rows in the same order, with empty values
 * shown as such, so fields stay in place while browsing. Custom fields, which only some items have,
 * come last.
 */
export function getPanelRows({ item, detail, totp, totpFailed, isLoading, error, now }: PanelInput): PanelRows {
  // Value of the fields that are only known once the item's details are loaded.
  const notLoaded: PanelValue = error ? { kind: "unavailable" } : isLoading ? { kind: "loading" } : EMPTY;

  const hasPassword = detail ? detail.password !== undefined : item.hasPassword;
  let password = EMPTY;
  if (hasPassword) password = MASKED;
  else if (hasPassword === undefined && item.type === "login") password = notLoaded;

  let code = EMPTY;
  if (totp) code = { kind: "code", ...totp };
  else if (item.hasTotp) code = error || totpFailed ? { kind: "unavailable" } : { kind: "loading" };

  const urls = detail?.urls ?? item.urls ?? [];
  const labels = websiteLabels(urls);
  const websites: PanelValue =
    urls.length > 0
      ? { kind: "websites", websites: urls.map((url, index) => ({ label: labels[index], url: toOpenableUrl(url) })) }
      : EMPTY;

  // Notes are masked like passwords; Show Note opens the full note.
  const hasNote = detail ? detail.note !== undefined : item.hasNote;
  let note = EMPTY;
  if (hasNote) note = MASKED;
  else if (hasNote === undefined) note = notLoaded;

  return {
    fields: [
      { id: "username", title: "Username", value: text((detail ?? item).username) },
      { id: "email", title: "Email", value: text((detail ?? item).email) },
      { id: "password", title: "Password", value: password },
      { id: "totp", title: "2FA Code", value: code },
      { id: "website", title: "Website", value: websites },
      { id: "note", title: "Note", value: note },
    ],
    metadata: [
      { id: "vault", title: "Vault", value: text(item.vaultName) },
      { id: "type", title: "Type", value: text(formatTypeLabel(item.type)) },
      {
        id: "modified",
        title: "Last Modified",
        value: text(item.modifiedAt ? formatRelativeTime(item.modifiedAt, now) : undefined),
      },
    ],
    customFields: (detail?.customFields ?? []).map((field, index) => ({
      id: `custom-${index}`,
      title: field.name,
      value: field.type === "hidden" ? MASKED : text(field.value),
    })),
  };
}
