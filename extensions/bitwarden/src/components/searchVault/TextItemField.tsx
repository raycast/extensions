import CopyFieldItemAction from "./actions/CopyFieldItemAction";
import PasteFieldItemAction from "./actions/PasteFieldItemAction";
import { BaseItemField } from "./BaseItemField";
import { TextField } from "./types/item-field";

type TextItemFieldProps = {
  item: TextField;
  onToggleDetailPanel: () => void;
};

/**
 * Renders a non-sensitive, plain-text vault field with two primary actions:
 * 1. **Copy** — copies the field value to the clipboard.
 * 2. **Paste** — pastes the field value into the frontmost application.
 *
 * @param props - See {@link TextItemFieldProps}.
 * @param props.item - The text field descriptor containing the display and raw values.
 * @param props.onToggleDetailPanel - Callback forwarded to {@link BaseItemField}
 *        to toggle the side detail panel.
 * @returns A {@link BaseItemField} element configured for plain-text display.
 */
function TextItemField({ item, onToggleDetailPanel }: TextItemFieldProps) {
  const copyContent = item.copyValue ?? item.value;
  return (
    <BaseItemField
      id={item.id}
      label={item.label}
      displayValue={item.displayValue ?? item.value}
      detailValue={item.value}
      icon={item.icon}
      accessories={item.accessories}
      onToggleDetailPanel={onToggleDetailPanel}
      mainActions={
        <>
          <CopyFieldItemAction label={item.label} content={copyContent} />
          <PasteFieldItemAction label={item.label} content={copyContent} />
        </>
      }
    />
  );
}

export default TextItemField;
