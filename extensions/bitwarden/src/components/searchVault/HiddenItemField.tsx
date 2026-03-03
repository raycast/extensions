import { Icon } from "@raycast/api";
import { useState } from "react";
import { SECRETS_MASK } from "~/constants/passwords";
import { ActionWithReprompt } from "../actions";
import CopyFieldItemAction from "./actions/CopyFieldItemAction";
import PasteFieldItemAction from "./actions/PasteFieldItemAction";
import { BaseItemField } from "./BaseItemField";
import { HiddenField } from "./types/item-field";

type HiddenItemFieldProps = {
  item: HiddenField;
  onToggleDetailPanel: () => void;
};

/**
 * Renders a sensitive vault field (e.g. password, security code) that is masked
 * with {@link SECRETS_MASK} by default.
 *
 * Provides three primary actions:
 * 1. **Copy** — copies the real value to the clipboard (marked as `password` type
 *    so Raycast treats it as transient/sensitive).
 * 2. **Paste** — pastes the real value into the frontmost application.
 * 3. **Reveal / Hide** (⌘H) — toggles between showing the real value and the mask.
 *    Wrapped in {@link ActionWithReprompt} so items with reprompt require
 *    re-authentication before the value is revealed.
 *
 * The row icon alternates between `showingIcon` and `hiddenIcon` (defaulting to
 * `Icon.Eye` / `Icon.EyeDisabled`) to reflect the current visibility state.
 *
 * @param props - See {@link HiddenItemFieldProps}.
 * @param props.item - The hidden field descriptor containing the sensitive value.
 * @param props.onToggleDetailPanel - Callback forwarded to {@link BaseItemField}
 *        to toggle the side detail panel.
 * @returns A {@link BaseItemField} element configured for sensitive-value display.
 */
function HiddenItemField({ item, onToggleDetailPanel }: HiddenItemFieldProps) {
  const [isShowing, setIsShowing] = useState(false);
  const showingIcon = item.showingIcon ?? Icon.Eye;
  const hiddenIcon = item.hiddenIcon ?? Icon.EyeDisabled;
  const copyContent = item.copyValue ?? item.value;

  return (
    <BaseItemField
      id={item.id}
      label={item.label}
      displayValue={isShowing ? item.displayValue ?? item.value : SECRETS_MASK}
      detailValue={isShowing ? item.value : SECRETS_MASK}
      icon={item.icon ?? (isShowing ? showingIcon : hiddenIcon)}
      onToggleDetailPanel={onToggleDetailPanel}
      mainActions={
        <>
          <CopyFieldItemAction label={item.label} content={copyContent} type="password" />
          <PasteFieldItemAction label={item.label} content={copyContent} />
          <ActionWithReprompt
            title={isShowing ? "Hide Value" : "Reveal Value"}
            icon={isShowing ? showingIcon : hiddenIcon}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "h" }, Windows: { modifiers: ["ctrl"], key: "h" } }}
            onAction={() => setIsShowing(!isShowing)}
            repromptDescription={isShowing ? "Hiding Value" : "Revealing Value"}
          />
        </>
      }
    />
  );
}

export default HiddenItemField;
