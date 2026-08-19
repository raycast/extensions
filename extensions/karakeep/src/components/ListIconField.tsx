import { Action, Form, Icon } from "@raycast/api";
import { EmojiPicker } from "./EmojiPicker";
import { useTranslation } from "../hooks/useTranslation";

/** Karakeep's own default for a list with no icon chosen. */
export const DEFAULT_LIST_ICON = "🔖";

/**
 * Free-text icon field. The API's `icon` is `z.string()` — REQUIRED, not
 * optional — so an empty field is an HTTP 400, which is why the form
 * substitutes DEFAULT_LIST_ICON rather than sending nothing.
 *
 * Free text rather than a dropdown so any emoji can be typed or pasted
 * (⌃⌘Space opens the system picker); ChooseIconAction offers a browsable grid
 * for when you would rather look than remember.
 */
export function ListIconField(itemProps: Form.ItemProps<string>) {
  const { t } = useTranslation();
  return <Form.TextField {...itemProps} title={t("list.listIcon")} placeholder={t("list.listIconPlaceholder")} />;
}

/** Belongs in the form's ActionPanel — Form fields can't carry their own actions. */
export function ChooseIconAction({ onPick }: { onPick: (emoji: string) => void }) {
  const { t } = useTranslation();
  return (
    <Action.Push
      title={t("list.iconPicker.title")}
      icon={Icon.Emoji}
      target={<EmojiPicker onPick={onPick} />}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "i" },
        Windows: { modifiers: ["ctrl"], key: "i" },
      }}
    />
  );
}
