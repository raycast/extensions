import { Form } from "@raycast/api";
import { useTranslation } from "../hooks/useTranslation";

/** Karakeep's own default for a list with no icon chosen. */
export const DEFAULT_LIST_ICON = "🔖";

/**
 * Free-text icon field. The API's `icon` is `z.string()` — REQUIRED, not
 * optional — so an empty field is an HTTP 400, which is why the form
 * substitutes DEFAULT_LIST_ICON rather than sending nothing.
 *
 * Free text rather than a dropdown so any emoji can be typed or pasted.
 * Raycast 2.1 added an inline picker to every text field — type `:` followed
 * by a name — which is why this carries no picker of its own.
 */
export function ListIconField(itemProps: Form.ItemProps<string>) {
  const { t } = useTranslation();
  return <Form.TextField {...itemProps} title={t("list.listIcon")} placeholder={t("list.listIconPlaceholder")} />;
}
