import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useTooltipFields } from "../hooks/useTooltipFields";
import { TOOLTIP_FIELD_OPTIONS } from "../lib/tooltipFields";
import { TooltipField } from "../types";

/**
 * A compact popup for picking which extra facts show in a Card's tooltip, and in what order.
 * "Shown" fields are checked and reorderable; "Available" fields are unchecked and get
 * appended to the end of "Shown" when picked.
 *
 * Owns its own copy of the fields (rather than taking them as props) because Action.Push
 * hands the target view a snapshot when it's pushed — a prop wouldn't refresh in place as
 * the user toggles items, so this view has to manage and persist the list itself.
 */
export function TooltipFieldsView() {
  const { pop } = useNavigation();
  const { fields, setFields, isTooltipFieldsLoaded } = useTooltipFields();

  const availableFields = TOOLTIP_FIELD_OPTIONS.map((option) => option.value).filter(
    (field) => !fields.includes(field),
  );

  function enable(field: TooltipField) {
    setFields([...fields, field]);
  }

  function disable(field: TooltipField) {
    setFields(fields.filter((f) => f !== field));
  }

  function move(field: TooltipField, delta: number) {
    const index = fields.indexOf(field);
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;

    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
  }

  return (
    <List
      navigationTitle="Configure Card Tooltip"
      searchBarPlaceholder="Search Fields"
      isLoading={!isTooltipFieldsLoaded}
    >
      <List.Section title="Shown in Tooltip">
        {fields.map((field, index) => (
          <List.Item
            key={field}
            icon={Icon.Checkmark}
            title={titleFor(field)}
            actions={
              <ActionPanel>
                <Action title="Remove from Tooltip" icon={Icon.Circle} onAction={() => disable(field)} />
                {index > 0 && (
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => move(field, -1)}
                  />
                )}
                {index < fields.length - 1 && (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => move(field, 1)}
                  />
                )}
                <Action title="Done" icon={Icon.Checkmark} onAction={pop} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Available">
        {availableFields.map((field) => (
          <List.Item
            key={field}
            icon={Icon.Circle}
            title={titleFor(field)}
            actions={
              <ActionPanel>
                <Action title="Add to Tooltip" icon={Icon.Checkmark} onAction={() => enable(field)} />
                <Action title="Done" icon={Icon.Checkmark} onAction={pop} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function titleFor(field: TooltipField): string {
  return TOOLTIP_FIELD_OPTIONS.find((option) => option.value === field)?.title ?? field;
}
