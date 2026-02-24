import { ActionPanel, Icon } from "@raycast/api";
import { useState } from "react";
import { ActionWithReprompt } from "../actions";
import { CopyTotpAction, PasteTotpAction } from "./actions";
import CopyFieldItemAction from "./actions/CopyFieldItemAction";
import PasteFieldItemAction from "./actions/PasteFieldItemAction";
import { BaseItemField } from "./BaseItemField";
import { TotpField } from "./types/item-field";

type TotpItemFieldProps = {
  item: TotpField;
  onToggleDetailPanel: () => void;
};

/**
 * Renders a TOTP (Time-based One-Time Password) field with two action tiers:
 *
 * **Primary actions:**
 * 1. **Copy TOTP Code** — computes the current TOTP code from the secret and
 *    copies it to the clipboard.
 * 2. **Paste TOTP Code** (⌘↵) — computes and pastes the code into the frontmost
 *    application.
 *
 * **Secondary "TOTP Secret" section:**
 * 1. **Reveal / Hide Secret** — toggles display of the raw TOTP seed in the
 *    subtitle and detail panel (hidden by default).
 * 2. **Copy Secret** — copies the raw seed (marked as `password` type).
 * 3. **Paste Secret** — pastes the raw seed.
 *
 * @param props - See {@link TotpItemFieldProps}.
 * @param props.item - The TOTP field descriptor containing the seed value and
 *        a {@link TotpField.secretLabel} used for the copy/paste action titles.
 * @param props.onToggleDetailPanel - Callback forwarded to {@link BaseItemField}
 *        to toggle the side detail panel.
 * @returns A {@link BaseItemField} element configured for TOTP display with a
 *          secondary action section.
 */
function TotpItemField({ item, onToggleDetailPanel }: TotpItemFieldProps) {
  const [isShowing, setIsShowing] = useState(false);
  const copyContent = item.copyValue ?? item.value;

  return (
    <BaseItemField
      id={item.id}
      label={item.label}
      displayValue={isShowing ? item.displayValue ?? item.value : ""}
      detailValue={isShowing ? item.value : ""}
      icon={item.icon}
      accessories={item.accessories}
      onToggleDetailPanel={onToggleDetailPanel}
      mainActions={
        <>
          <CopyTotpAction omitShortcut={true} />
          <PasteTotpAction
            shortcut={{ macOS: { key: "return", modifiers: ["cmd"] }, Windows: { key: "return", modifiers: ["ctrl"] } }}
          />
        </>
      }
      additionalActionsSections={
        <>
          <ActionPanel.Section title="TOTP Secret">
            <ActionWithReprompt
              title={isShowing ? `Hide Secret` : `Reveal Secret`}
              icon={isShowing ? Icon.EyeDisabled : Icon.Eye}
              onAction={() => setIsShowing(!isShowing)}
              repromptDescription={isShowing ? `Hiding Secret` : `Revealing Secret`}
            />
            <CopyFieldItemAction label={item.secretLabel} content={copyContent} type="password" />
            <PasteFieldItemAction label={item.secretLabel} content={copyContent} />
          </ActionPanel.Section>
        </>
      }
    />
  );
}

export default TotpItemField;
