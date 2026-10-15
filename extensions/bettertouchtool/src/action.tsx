import { ActionPanel, Action, List, Icon, Keyboard, closeMainWindow, Form, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { useForm } from "@raycast/utils";
import { actions } from "bettertouchtool";
import { actionCatalog, type ActionDefinition } from "bettertouchtool/catalog";
import {
  formatInitialValue,
  getParameterFields,
  parseFormValue,
  type FormValues,
  type ParameterField,
} from "./action-parameters";
import { getActionCategoryIconName, getActionIconName } from "./action-icons";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import { DevelopmentDiagnosticsSection } from "./diagnostics";
import { sortPinnedItems } from "./pinning";
import { usePinnedIds } from "./use-pinned-ids";

const allCategories = "all";
const pinnedActionIdsStorageKey = "pinned-action-ids";

export default function Command() {
  const [category, setCategory] = useState(allCategories);
  const { isLoading: isLoadingPins, pinnedIds, togglePinned } = usePinnedIds(pinnedActionIdsStorageKey);
  const categories = useMemo(
    () =>
      [...new Set(actionCatalog.all.map((actionDefinition) => actionDefinition.category))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [],
  );
  const filteredActions = useMemo(() => {
    const actions =
      category === allCategories
        ? actionCatalog.all
        : actionCatalog.all.filter((actionDefinition) => actionDefinition.category === category);
    return sortPinnedItems(actions, pinnedIds, (actionDefinition) => String(actionDefinition.id));
  }, [category, pinnedIds]);

  return (
    <List
      isLoading={isLoadingPins}
      searchBarPlaceholder="Search actions..."
      searchBarAccessory={<CategoryDropdown categories={categories} value={category} onChange={setCategory} />}
      throttle
    >
      <List.Section
        title={category === allCategories ? "All Actions" : category}
        subtitle={String(filteredActions.length)}
      >
        {filteredActions.map((actionDefinition) => (
          <ActionItem
            key={actionDefinition.id}
            actionDefinition={actionDefinition}
            isPinned={pinnedIds.has(String(actionDefinition.id))}
            onTogglePinned={() => togglePinned(String(actionDefinition.id))}
          />
        ))}
      </List.Section>
    </List>
  );
}

function CategoryDropdown({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Filter by action category" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Categories" value={allCategories} icon={Icon.List} />
      {categories.map((category) => (
        <List.Dropdown.Item
          key={category}
          title={category}
          value={category}
          icon={Icon[getActionCategoryIconName(category)]}
        />
      ))}
    </List.Dropdown>
  );
}

function ActionForm({ actionDefinition }: { actionDefinition: ActionDefinition }) {
  const fields = getParameterFields(actionDefinition);

  async function submitAction(values: FormValues) {
    try {
      const extra = fields.reduce<Record<string, unknown>>((result, field) => {
        const value = parseFormValue(values[field.definition.key], field);
        return value === undefined ? result : { ...result, [field.definition.key]: value };
      }, {});

      await createBttClient().triggerAction(actions.action(actionDefinition.id, extra));
    } catch (error) {
      await showBttFailureToast(error, "Failed to run action");
    }
  }

  const textFields = fields.filter((field) => field.kind !== "boolean");
  const { handleSubmit, itemProps } = useForm<Record<string, string>>({
    initialValues: Object.fromEntries(
      textFields.map((field) => [field.definition.key, formatInitialValue(field.initialValue, field.kind)]),
    ),
    validation: Object.fromEntries(
      textFields.map((field) => [
        field.definition.key,
        (value: string | undefined) => {
          try {
            parseFormValue(value, field);
            return undefined;
          } catch (error) {
            return error instanceof Error ? error.message : "Enter a valid value";
          }
        },
      ]),
    ),
    onSubmit: (values) => submitAction(values as FormValues),
  });

  return (
    <Form
      navigationTitle={actionDefinition.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Action" onSubmit={handleSubmit} icon={Icon.PlayFilled} />
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    >
      <Form.Description title={actionDefinition.name} text={actionDefinition.description} />
      <Form.Separator />
      {fields.map((field) => (
        <ParameterInput key={field.definition.key} field={field} itemProps={itemProps[field.definition.key]} />
      ))}
    </Form>
  );
}

function ParameterInput({
  field,
  itemProps,
}: {
  field: ParameterField;
  itemProps: Partial<Form.ItemProps<string>> & { id: string };
}) {
  const { definition, initialValue, kind } = field;

  if (kind === "boolean") {
    return (
      <Form.Checkbox
        id={definition.key}
        title={definition.key}
        label={definition.description || definition.key}
        defaultValue={Boolean(initialValue)}
      />
    );
  }

  if (kind === "json" || kind === "raw-json") {
    return (
      <Form.TextArea
        title={definition.key}
        info={
          kind === "raw-json"
            ? [
                definition.description,
                "The catalog does not identify a reliable type. Enter a valid JSON value; quote string values.",
              ]
                .filter(Boolean)
                .join(" ")
            : definition.description
        }
        placeholder={kind === "json" ? "JSON object or array" : 'JSON value, e.g. "text", 42, or true'}
        {...itemProps}
      />
    );
  }

  return (
    <Form.TextField
      title={definition.key}
      info={definition.description}
      placeholder={kind === "number" ? "Enter a number" : "Enter a value"}
      {...itemProps}
    />
  );
}

function ActionItem({
  actionDefinition,
  isPinned,
  onTogglePinned,
}: {
  actionDefinition: ActionDefinition;
  isPinned: boolean;
  onTogglePinned: () => Promise<void>;
}) {
  const { push } = useNavigation();
  const fields = getParameterFields(actionDefinition);

  async function handleRun(closeWindow = false) {
    if (fields.length > 0) {
      push(<ActionForm actionDefinition={actionDefinition} />);
      return;
    }

    if (closeWindow) {
      await closeMainWindow();
    }

    try {
      await createBttClient().triggerAction(actions.action(actionDefinition.id), { waitForReply: !closeWindow });
    } catch (error) {
      await showBttFailureToast(error, "Failed to run action");
    }
  }

  return (
    <List.Item
      id={String(actionDefinition.id)}
      title={actionDefinition.name}
      subtitle={actionDefinition.description}
      icon={Icon[getActionIconName(actionDefinition)]}
      accessories={[
        ...(isPinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []),
        { tag: actionDefinition.category },
        { text: String(actionDefinition.id), icon: Icon.Hashtag },
      ]}
      keywords={[actionDefinition.slug, actionDefinition.category]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={fields.length > 0 ? "Configure Action" : "Run Action with BTT"}
              onAction={() => handleRun()}
              icon={fields.length > 0 ? Icon.Gear : Icon.PlayFilled}
            />
            {fields.length === 0 ? (
              <Action title="Run Action in Background" onAction={() => handleRun(true)} icon={Icon.Play} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isPinned ? "Unpin Action" : "Pin Action"}
              onAction={onTogglePinned}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
            />
          </ActionPanel.Section>
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    />
  );
}
