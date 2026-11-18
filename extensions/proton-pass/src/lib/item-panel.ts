import { formatRelativeTime, formatTypeLabel, toOpenableUrl, websiteLabels } from "./format";
import { folderPathLabel } from "./folders";
import { fieldsOf, lastDigitsOf } from "./item-fields";
import { CustomField, Item, ItemDetail } from "./types";

export type PanelValue =
  | { kind: "text"; text: string }
  | { kind: "masked"; lastDigits?: string }
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "code"; code: string; remainingSeconds?: number; period?: number }
  | { kind: "websites"; websites: { label: string; url: string }[] };

export interface PanelRow {
  id: string;
  title: string;
  value: PanelValue;
  /** The section of the item a custom field is in, if any. */
  section?: string;
}

export interface PanelRows {
  /**
   * What the item holds: a login's username, email, password and TOTP code, a card's number, an identity's name, etc.
   * A note's is its note. Custom items have none: all they hold are their custom fields.
   */
  main: PanelRow[];
  /** What tells about the item: a login's websites, the note, vault, folder, type and last change. */
  details: PanelRow[];
  customFields: PanelRow[];
}

export interface PanelInput {
  item: Item;
  /** Loaded details of the item, when it's selected. */
  detail?: ItemDetail;
  totp?: { code: string; remainingSeconds?: number; period?: number };
  /** The TOTP code couldn't be fetched. */
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
 * Rows of the item details panel. Every item of a type gets the same rows in the same order, with empty values shown as
 * such, so fields stay in place while browsing; the fields that only some items have, like most of an identity's, are
 * shown when filled. Custom fields come last.
 */
export function getPanelRows({ item, detail, totp, totpFailed, isLoading, error, now }: PanelInput): PanelRows {
  // Value of the fields that are only known once the item's details are loaded.
  const notLoaded: PanelValue = error ? { kind: "unavailable" } : isLoading ? { kind: "loading" } : EMPTY;

  // Notes are masked like passwords; Show Note opens the full note.
  const hasNote = detail ? detail.note !== undefined : item.hasNote;
  let note = EMPTY;
  if (hasNote) note = MASKED;
  else if (hasNote === undefined) note = notLoaded;
  const noteRow: PanelRow = { id: "note", title: "Note", value: note };

  let main: PanelRow[];
  if (item.type === "login") main = loginRows({ item, detail, totp, totpFailed, error }, notLoaded);
  else if (item.type === "note") main = [noteRow];
  else main = typeFieldRows(item, detail, notLoaded);

  return {
    main,
    details: [
      ...(item.type === "login" ? [websiteRow(item, detail)] : []),
      ...(item.type === "note" ? [] : [noteRow]),
      { id: "vault", title: "Vault", value: text(item.vaultName) },
      { id: "folder", title: "Folder", value: text(item.folderPath && folderPathLabel(item.folderPath)) },
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
      value: customFieldValue(field),
      ...(field.section ? { section: field.section } : {}),
    })),
  };
}

function loginRows(
  { item, detail, totp, totpFailed, error }: Pick<PanelInput, "item" | "detail" | "totp" | "totpFailed" | "error">,
  notLoaded: PanelValue,
): PanelRow[] {
  const hasPassword = detail ? detail.password !== undefined : item.hasPassword;
  let password = EMPTY;
  if (hasPassword) password = MASKED;
  else if (hasPassword === undefined) password = notLoaded;

  let code = EMPTY;
  if (totp) code = { kind: "code", ...totp };
  else if (item.hasTotp) code = error || totpFailed ? { kind: "unavailable" } : { kind: "loading" };

  return [
    { id: "username", title: "Username", value: text((detail ?? item).username) },
    { id: "email", title: "Email", value: text((detail ?? item).email) },
    { id: "password", title: "Password", value: password },
    { id: "totp", title: "TOTP Code", value: code },
  ];
}

function websiteRow(item: Item, detail: ItemDetail | undefined): PanelRow {
  const urls = detail?.urls ?? item.urls ?? [];
  const labels = websiteLabels(urls);
  const websites: PanelValue =
    urls.length > 0
      ? { kind: "websites", websites: urls.map((url, index) => ({ label: labels[index], url: toOpenableUrl(url) })) }
      : EMPTY;
  return { id: "website", title: "Website", value: websites };
}

/** The fields of a card, identity, alias, SSH key or Wi-Fi network, which are only known once its details are loaded. */
function typeFieldRows(item: Item, detail: ItemDetail | undefined, notLoaded: PanelValue): PanelRow[] {
  return fieldsOf(item.type)
    .filter((spec) => !spec.copyOnly)
    .flatMap((spec) => {
      const value = detail?.fields?.[spec.id];
      if (spec.optional && !value) return [];
      let shown: PanelValue = detail ? EMPTY : notLoaded;
      if (value && spec.secret) {
        const lastDigits = spec.showLastDigits ? lastDigitsOf(value) : undefined;
        shown = lastDigits ? { kind: "masked", lastDigits } : MASKED;
      } else if (value) shown = text(value);
      return [{ id: spec.id, title: spec.title, value: shown }];
    });
}

function customFieldValue(field: CustomField): PanelValue {
  return field.type === "hidden" || field.type === "totp" ? MASKED : text(field.value);
}
