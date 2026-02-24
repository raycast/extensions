import { Action, Icon } from "@raycast/api";
import { uriSchemeIcon } from "~/utils/uri";
import CopyFieldItemAction from "./actions/CopyFieldItemAction";
import { BaseItemField } from "./BaseItemField";
import { LinkField } from "./types/item-field";

type LinkItemFieldProps = {
  item: LinkField;
  onToggleDetailPanel: () => void;
};

/**
 * Renders a URI/URL field with two primary actions:
 * 1. **Copy** — copies the URI to the clipboard.
 * 2. **Open in Browser** (⌘↵) — opens the URI in the default browser.
 *
 * The row icon is derived from the URI scheme (e.g. `https` → globe icon) via
 * {@link uriSchemeIcon}, and a trailing link accessory indicates the value is
 * openable.
 *
 * @param props - See {@link LinkItemFieldProps}.
 * @param props.item - The link field descriptor containing the URI value.
 * @param props.onToggleDetailPanel - Callback forwarded to {@link BaseItemField}
 *        to toggle the side detail panel.
 * @returns A {@link BaseItemField} element configured for URI display.
 */
function LinkItemField({ item, onToggleDetailPanel }: LinkItemFieldProps) {
  const copyContent = item.copyValue ?? item.value;
  return (
    <BaseItemField
      id={item.id}
      label={item.label}
      displayValue={item.displayValue ?? item.value}
      detailValue={item.value}
      icon={item.icon ?? uriSchemeIcon(item.value)}
      accessories={item.accessories ?? [{ icon: Icon.Link, tooltip: "Open" }]}
      onToggleDetailPanel={onToggleDetailPanel}
      mainActions={
        <>
          <CopyFieldItemAction label={item.label} content={copyContent} />
          <Action.OpenInBrowser
            url={item.value}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "return" }, Windows: { modifiers: ["ctrl"], key: "return" } }}
          />
        </>
      }
    />
  );
}

export default LinkItemField;
