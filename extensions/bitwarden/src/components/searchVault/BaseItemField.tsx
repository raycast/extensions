import { ActionPanel, Icon, List } from "@raycast/api";
import { ReactNode } from "react";
import { ActionWithReprompt } from "../actions";
import { asPlainTextDetail } from "~/utils/strings";

type BaseItemFieldProps = {
  id: string;
  label: string;
  /** The text shown in the list subtitle */
  displayValue: string;
  /** The real value shown in the side panel (detail view) */
  detailValue: string;
  icon?: Icon;
  accessories?: List.Item.Accessory[];

  /** Injected actions from the parent */
  mainActions?: ReactNode;
  /** Injected action sections from the parent */
  additionalActionsSections?: ReactNode;
  onToggleDetailPanel: () => void;
};

/**
 * Base `List.Item` row component shared by all field-type renderers.
 *
 * Provides a consistent layout: icon, label (title), subtitle, optional
 * accessories, a togglable detail side-panel showing the raw value as
 * monospaced text, and a composable action panel.
 *
 * Specialised field components (e.g. {@link HiddenItemField}, {@link LinkItemField})
 * inject their type-specific actions via {@link BaseItemFieldProps.mainActions}
 * and {@link BaseItemFieldProps.additionalActionsSections}. A built-in
 * "Toggle Detail Panel" action (⌘D) is always appended after `mainActions`.
 *
 * @param props - See {@link BaseItemFieldProps}.
 * @returns A `List.Item` element.
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
            <ActionWithReprompt
              title="Toggle Detail Panel"
              icon={Icon.Sidebar}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
              onAction={onToggleDetailPanel}
              repromptDescription="Toggling Detail Panel"
            />
          </ActionPanel.Section>
          {additionalActionsSections}
        </ActionPanel>
      }
    />
  );
}
