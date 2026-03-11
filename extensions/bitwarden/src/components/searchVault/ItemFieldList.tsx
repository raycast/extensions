import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ReactNode, useState } from "react";
import { SECRETS_MASK } from "~/constants/passwords";
import { Item, ItemType } from "~/types/vault";
import { asPlainTextDetail } from "~/utils/strings";
import { uriSchemeIcon } from "~/utils/uri";
import { CopyFieldItemAction, CopyTotpAction, PasteFieldItemAction, PasteTotpAction } from "./actions";
import { HiddenField, LinkField, TextField, TotpField } from "./types/item-field";
import { buildFieldSections } from "./utils/buildFieldSections";

type BaseItemFieldProps = {
  /** Unique identifier for the list item */
  id: string;
  /** The field name displayed as the list item title */
  label: string;
  /** The text shown in the list subtitle */
  displayValue: string;
  /** Content for the detail side-panel; strings rendered as monospaced markdown, `List.Item.Detail` for more custom views */
  detailValue: string | ReactNode;
  /** Leading icon for the list item */
  icon?: Icon;
  /** Trailing accessory elements appended to the list item row */
  accessories?: List.Item.Accessory[];

  /** Injected actions from the parent */
  mainActions?: ReactNode;
  /** Injected action sections from the parent */
  additionalActionsSections?: ReactNode;
  /** Callback to show or hide the detail side-panel */
  onToggleDetailPanel: () => void;
};

type TextItemFieldProps = {
  item: TextField;
  onToggleDetailPanel: () => void;
};

type LinkItemFieldProps = {
  item: LinkField;
  onToggleDetailPanel: () => void;
};

type HiddenItemFieldProps = {
  item: HiddenField;
  onToggleDetailPanel: () => void;
};

type TotpItemFieldProps = {
  item: TotpField;
  onToggleDetailPanel: () => void;
};

type ItemFieldListProps = {
  item: Item;
  folderName?: string;
};

/**
 * Renders the complete field list for a vault item, grouped into titled sections.
 * The detail side-panel defaults to open for `NOTE` items (whose primary content
 * is the notes body) and closed for all other types.
 */
function ItemFieldList({ item, folderName }: ItemFieldListProps) {
  const [detailPanelOpen, setDetailPanelOpen] = useState(item.type === ItemType.NOTE);

  const navigationTitle = `${folderName ? "/" + folderName : ""}/${item.name}`;
  const sections = buildFieldSections(item);

  function toggleDetailPanel() {
    setDetailPanelOpen((prev) => !prev);
  }

  if (sections.length === 0) {
    return (
      <List navigationTitle={navigationTitle} searchBarPlaceholder="">
        <List.EmptyView title="No fields to display" description="This item has no displayable fields." />
      </List>
    );
  }

  return (
    <List navigationTitle={navigationTitle} searchBarPlaceholder="Filter fields" isShowingDetail={detailPanelOpen}>
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.fields.map((field) => {
            switch (field.type) {
              case "text":
                return <TextItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
              case "link":
                return <LinkItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
              case "hidden":
                return <HiddenItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
              case "totp":
                return <TotpItemField key={field.id} item={field} onToggleDetailPanel={toggleDetailPanel} />;
            }
          })}
        </List.Section>
      ))}
    </List>
  );
}

/**
 * Base `List.Item` row component shared by all field-type renderers.
 *
 * Provides a consistent layout: icon, label (title), subtitle, optional
 * accessories, a togglable detail side-panel showing the raw value as
 * monospaced text, and a composable action panel.
 */
export function BaseItemField({
  id,
  label,
  displayValue,
  detailValue,
  icon,
  accessories,
  mainActions,
  additionalActionsSections,
  onToggleDetailPanel,
}: BaseItemFieldProps) {
  return (
    <List.Item
      id={id}
      title={label}
      subtitle={displayValue}
      icon={icon ?? Icon.Clipboard}
      accessories={accessories}
      detail={
        typeof detailValue === "string" ? <List.Item.Detail markdown={asPlainTextDetail(detailValue)} /> : detailValue
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {mainActions}
            <Action
              title="Toggle Detail Panel"
              icon={Icon.Sidebar}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
              onAction={onToggleDetailPanel}
            />
          </ActionPanel.Section>
          {additionalActionsSections}
        </ActionPanel>
      }
    />
  );
}

/**
 * Renders a non-sensitive, plain-text vault field with two primary actions:
 * 1. **Copy** — copies the field value to the clipboard.
 * 2. **Paste** — pastes the field value into the frontmost application.
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

/**
 * Renders a URI/URL field with two primary actions:
 * 1. **Copy** — copies the URI to the clipboard.
 * 2. **Open in Browser** (⌘↵) — opens the URI in the default browser.
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

/**
 * Renders a sensitive vault field (e.g. password, security code) that is masked
 * with {@link SECRETS_MASK} by default.
 *
 * Provides three primary actions:
 * 1. **Copy** — copies the real value to the clipboard (marked as `password` type
 *    so Raycast treats it as transient/sensitive).
 * 2. **Paste** — pastes the real value into the frontmost application.
 * 3. **Reveal / Hide** — toggles between showing the real value and the mask.
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
          <Action
            title={isShowing ? "Hide Value" : "Reveal Value"}
            icon={isShowing ? showingIcon : hiddenIcon}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "h" }, Windows: { modifiers: ["ctrl"], key: "h" } }}
            onAction={() => setIsShowing((current) => !current)}
          />
        </>
      }
    />
  );
}

/**
 * Renders a TOTP (Time-based One-Time Password) field with two action tiers:
 *
 * **Primary actions:**
 * 1. **Copy TOTP Code** — computes the current TOTP code from the secret and
 *    copies it to the clipboard.
 * 2. **Paste TOTP Code** — computes and pastes the code into the frontmost
 *    application.
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
          <CopyTotpAction skipReprompt={true} shortcut={null} />
          <PasteTotpAction
            skipReprompt={true}
            shortcut={{ macOS: { key: "return", modifiers: ["cmd"] }, Windows: { key: "return", modifiers: ["ctrl"] } }}
          />
        </>
      }
      additionalActionsSections={
        <>
          <ActionPanel.Section title="TOTP Secret">
            <Action
              title={isShowing ? `Hide Secret` : `Reveal Secret`}
              icon={isShowing ? Icon.EyeDisabled : Icon.Eye}
              onAction={() => setIsShowing((current) => !current)}
            />
            <CopyFieldItemAction label={item.secretLabel} content={copyContent} type="password" />
            <PasteFieldItemAction label={item.secretLabel} content={copyContent} />
          </ActionPanel.Section>
        </>
      }
    />
  );
}

export default ItemFieldList;
