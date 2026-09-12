import { Clipboard, Icon, List } from "@raycast/api";

/**
 * Common properties shared by every field type in the item detail list.
 *
 * Each field maps to a single `List.Item` row inside a `List.Section`.
 * Specialised field types extend this with a discriminant `type` property
 * and any type-specific extras (e.g. toggle icons for hidden fields).
 */
type BaseField = {
  /** Stable key used for React rendering and list item identification. */
  id: string;
  /** Human-readable name shown as the row title (e.g. "Username", "Password"). */
  label: string;
  /** The raw field value. */
  value: string;
  /** Icon displayed to the left of the row. */
  icon?: Icon;
  /** Shown in list subtitle if different from value. */
  displayValue?: string;
  /** Value placed on the clipboard when the user copies this field. Defaults to {@link displayValue} or {@link value}. */
  copyValue?: string | number | Clipboard.Content;
  /** Custom detail panel content; when omitted, {@link value} is rendered as monospaced text. */
  detail?: string | typeof List.Item.Detail;
  /** Trailing accessories (icons/text) appended to the row. */
  accessories?: List.Item.Accessory[];
};

/**
 * A non-sensitive, plain-text field.
 */
export type TextField = BaseField & {
  type: "text";
};

/**
 * A URI/URL field that can be opened in the user's default browser.
 */
export type LinkField = BaseField & {
  type: "link";
};

/**
 * A sensitive field (e.g. password, security code, SSN) that is masked with
 * {@link SECRETS_MASK} by default and can be revealed via a toggle action.
 */
export type HiddenField = BaseField & {
  type: "hidden";
  /** Icon shown when the value is revealed. Defaults to `Icon.Eye`. */
  showingIcon?: Icon;
  /** Icon shown when the value is masked. Defaults to `Icon.EyeDisabled`. */
  hiddenIcon?: Icon;
};

/**
 * A TOTP (Time-based One-Time Password) field.
 */
export type TotpField = BaseField & {
  type: "totp";
  /** Label used when copying or pasting the TOTP secret (e.g. "TOTP Secret"). */
  secretLabel: string;
};

/**
 * Discriminated union of every field type that can appear in a vault item's
 * detail list. Discriminated on the `type` property (`"text"`, `"link"`,
 * `"hidden"`, `"totp"`).
 */
export type ItemField = TextField | LinkField | HiddenField | TotpField;

/**
 * A titled group of {@link ItemField}s rendered as a `List.Section` in the
 * item detail view.
 */
export type FieldSection = {
  /** Section heading displayed above the group (e.g. "Login", "URIs", "Custom Fields"). */
  title: string;
  /** Ordered fields rendered as rows within this section. */
  fields: ItemField[];
};
