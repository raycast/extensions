import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { useMemo, useState } from "react";
import { actions, ActionType, type Btt } from "bettertouchtool";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import { DevelopmentDiagnosticsSection } from "./diagnostics";
import { sortPinnedItems } from "./pinning";
import { usePinnedIds } from "./use-pinned-ids";
import { type VariableDefinition } from "./variable-definitions";
import {
  filterVariableDefinitions,
  formatVariableValuePreview,
  getPersistentVariableNames,
  isVariableSet,
  mergeVariableDefinitions,
  parseNewVariable,
  type NewVariableFormValues,
  type VariableFilter,
  type WritableVariableType,
} from "./variable-utils";

const execFileAsync = promisify(execFile);
const userVariablesPath = join(homedir(), "Library/Application Support/BetterTouchTool/btt_user_variables.plist");
const variableValueBatchSize = 8;
const pinnedVariableIdsStorageKey = "pinned-variable-ids";

interface SetVariableData {
  names: string[];
  values: Array<{ name: string; value: string | number }>;
}

export default function Command() {
  const [variableFilter, setVariableFilter] = useState<VariableFilter>("all");
  const [createdVariableNames, setCreatedVariableNames] = useState<string[]>([]);
  const btt = useMemo(createBttClient, []);
  const { isLoading: isLoadingPins, pinnedIds, togglePinned } = usePinnedIds(pinnedVariableIdsStorageKey);
  const {
    isLoading,
    data = [],
    revalidate,
  } = usePromise(loadVariableDefinitions, [], {
    failureToastOptions: { title: "Could not load BTT variables" },
  });
  const variables = useMemo(
    () =>
      mergeVariableDefinitions([
        ...data.filter((variable) => variable.persistent).map((variable) => variable.name),
        ...createdVariableNames,
      ]),
    [createdVariableNames, data],
  );
  const {
    isLoading: isLoadingSetVariables,
    data: setVariableData,
    revalidate: revalidateSetVariables,
  } = usePromise(loadSetVariableData, [btt, variables], {
    execute: variableFilter === "set" && variables.length > 0,
    failureToastOptions: { title: "Could not determine which BTT variables are set" },
  });
  const setVariableValues = useMemo(
    () => new Map(setVariableData?.values.map(({ name, value }) => [name, value])),
    [setVariableData],
  );
  const filteredVariables = useMemo(
    () =>
      sortPinnedItems(
        filterVariableDefinitions(variables, variableFilter, new Set(setVariableData?.names)),
        pinnedIds,
        (variable) => variable.name,
      ),
    [pinnedIds, setVariableData, variableFilter, variables],
  );
  const existingVariableNames = useMemo(() => new Set(variables.map((variable) => variable.name)), [variables]);

  async function refreshVariables() {
    await revalidate();
    if (variableFilter === "set") await revalidateSetVariables();
  }

  async function showAllVariablesInBtt() {
    try {
      await btt.triggerAction(actions.action(ActionType.SHOW_VARIABLES_VIEW));
    } catch (error) {
      await showBttFailureToast(error, "Could not open BTT Variables");
    }
  }

  async function handleVariableCreated(name: string) {
    setCreatedVariableNames((currentNames) => (currentNames.includes(name) ? currentNames : [...currentNames, name]));
    setVariableFilter("persistent");
    await revalidate();
  }

  return (
    <List
      isLoading={isLoading || isLoadingPins || (variableFilter === "set" && isLoadingSetVariables)}
      searchBarPlaceholder="Search BTT variables..."
      searchBarAccessory={<VariableFilterDropdown value={variableFilter} onChange={setVariableFilter} />}
      throttle
      actions={
        <ActionPanel>
          <CreateVariableAction btt={btt} existingNames={existingVariableNames} onCreated={handleVariableCreated} />
          <ActionPanel.Section>
            <RefreshVariablesAction onRefresh={refreshVariables} />
            <Action title="Show All Variables in BTT" onAction={showAllVariablesInBtt} icon={Icon.AppWindowList} />
          </ActionPanel.Section>
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    >
      {filteredVariables.map((variable) => (
        <VariableItem
          key={variable.name}
          variable={variable}
          btt={btt}
          previewValue={variableFilter === "set" ? setVariableValues.get(variable.name) : undefined}
          existingNames={existingVariableNames}
          onVariableCreated={handleVariableCreated}
          onRefresh={refreshVariables}
          isPinned={pinnedIds.has(variable.name)}
          onTogglePinned={() => togglePinned(variable.name)}
        />
      ))}
    </List>
  );
}

function VariableFilterDropdown({
  value,
  onChange,
}: {
  value: VariableFilter;
  onChange: (value: VariableFilter) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter variables by type"
      value={value}
      onChange={(newValue) => onChange(newValue as VariableFilter)}
    >
      <List.Dropdown.Item title="All Variables" value="all" />
      <List.Dropdown.Item title="Set Variables" value="set" />
      <List.Dropdown.Item title="Dynamic" value="dynamic" />
      <List.Dropdown.Item title="Context" value="context" />
      <List.Dropdown.Item title="Persistent" value="persistent" />
    </List.Dropdown>
  );
}

function VariableItem({
  variable,
  btt,
  previewValue,
  existingNames,
  onVariableCreated,
  onRefresh,
  isPinned,
  onTogglePinned,
}: {
  variable: VariableDefinition;
  btt: Btt;
  previewValue?: string | number;
  existingNames: ReadonlySet<string>;
  onVariableCreated: (name: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isPinned: boolean;
  onTogglePinned: () => Promise<void>;
}) {
  return (
    <List.Item
      title={variable.name}
      subtitle={variable.description}
      keywords={[variable.category, variable.persistent ? "persistent" : "dynamic"]}
      accessories={[
        ...(isPinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []),
        ...(previewValue !== undefined
          ? [{ text: formatVariableValuePreview(previewValue), tooltip: String(previewValue) }]
          : []),
        { tag: variable.category },
        ...(variable.readOnly ? [{ icon: Icon.Lock, tooltip: "Read only" }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Variable"
            target={<VariableDetail variable={variable} btt={btt} />}
            icon={Icon.Eye}
          />
          {!variable.readOnly ? (
            <Action.Push
              title="Edit Value"
              target={<LoadVariableEditor variable={variable} btt={btt} />}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
          ) : null}
          {!variable.readOnly && variable.persistent ? (
            <ClearVariableValueAction variable={variable} btt={btt} onCleared={onRefresh} />
          ) : null}
          <ActionPanel.Section>
            <Action
              title={isPinned ? "Unpin Variable" : "Pin Variable"}
              onAction={onTogglePinned}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
            />
            <Action.CopyToClipboard
              title="Copy Variable Name"
              content={variable.name}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CreateVariableAction btt={btt} existingNames={existingNames} onCreated={onVariableCreated} />
            <RefreshVariablesAction onRefresh={onRefresh} />
          </ActionPanel.Section>
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    />
  );
}

function CreateVariableAction({
  btt,
  existingNames,
  onCreated,
}: {
  btt: Btt;
  existingNames: ReadonlySet<string>;
  onCreated: (name: string) => Promise<void>;
}) {
  return (
    <Action.Push
      title="Create New Variable"
      target={<CreateVariableForm btt={btt} existingNames={existingNames} onCreated={onCreated} />}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
}

function RefreshVariablesAction({ onRefresh }: { onRefresh: () => Promise<void> }) {
  return (
    <Action
      title="Refresh Variables"
      onAction={onRefresh}
      icon={Icon.RotateClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}

function ClearVariableValueAction({
  variable,
  btt,
  onCleared,
}: {
  variable: VariableDefinition;
  btt: Btt;
  onCleared: () => Promise<unknown>;
}) {
  async function handleClear() {
    const confirmed = await confirmAlert({
      title: `Clear ${variable.name}?`,
      message: "The variable will remain available, but its value will be replaced with an empty string.",
      icon: Icon.Eraser,
      primaryAction: { title: "Clear Value", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await btt.vars.set(variable.name, "", { persistent: true });
      await onCleared();
      await showToast({ title: "Variable value cleared", message: variable.name, style: Toast.Style.Success });
    } catch (error) {
      await showBttFailureToast(error, `Could not clear ${variable.name}`);
    }
  }

  return (
    <Action
      title="Clear Value"
      onAction={handleClear}
      icon={Icon.Eraser}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
    />
  );
}

function CreateVariableForm({
  btt,
  existingNames,
  onCreated,
}: {
  btt: Btt;
  existingNames: ReadonlySet<string>;
  onCreated: (name: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [type, setType] = useState<WritableVariableType>("string");

  async function createVariable(values: NewVariableFormValues) {
    const parsed = parseNewVariable(values, existingNames);
    if (!parsed.success) {
      await showToast({ title: parsed.error, style: Toast.Style.Failure });
      return;
    }

    try {
      await btt.vars.set(parsed.name, parsed.value, { persistent: true });
      await onCreated(parsed.name);
      await showToast({ title: "Variable created", message: parsed.name, style: Toast.Style.Success });
      pop();
    } catch (error) {
      await showBttFailureToast(error, `Could not create ${parsed.name}`);
    }
  }

  const { handleSubmit, itemProps, setValidationError } = useForm<NewVariableFormValues>({
    onSubmit: createVariable,
    validation: {
      name: (value) => {
        if (!value?.trim()) return "Enter a variable name.";
        if (existingNames.has(value)) return `A variable named “${value}” already exists.`;
        return undefined;
      },
      value: (value) => {
        if (type !== "number") return undefined;
        return value?.trim() && Number.isFinite(Number(value)) ? undefined : "Enter a finite number.";
      },
    },
  });

  return (
    <Form
      navigationTitle="Create BTT Variable"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Variable" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Description text="New variables are persistent so they remain available after BetterTouchTool restarts." />
      <Form.TextField title="Variable Name" placeholder="Enter a unique name" autoFocus {...itemProps.name} />
      <Form.Dropdown
        id="type"
        title="Type"
        value={type}
        onChange={(newType) => {
          setType(newType as WritableVariableType);
          setValidationError("value", undefined);
        }}
      >
        <Form.Dropdown.Item title="Text" value="string" />
        <Form.Dropdown.Item title="Number" value="number" />
      </Form.Dropdown>
      {type === "number" ? (
        <Form.TextField title="Value" placeholder="Enter a number" {...itemProps.value} />
      ) : (
        <Form.TextArea title="Value" placeholder="Enter text" {...itemProps.value} />
      )}
    </Form>
  );
}

function VariableDetail({ variable, btt }: { variable: VariableDefinition; btt: Btt }) {
  const { isLoading, data, revalidate } = usePromise(loadVariableValue, [btt, variable.name], {
    failureToastOptions: { title: `Could not read ${variable.name}` },
  });
  const value = data?.value;
  const formattedValue = value === undefined ? "" : String(value);
  const markdown = [
    `# ${variable.name}`,
    variable.description ?? "",
    `- Type: \`${data?.type || "unknown"}\``,
    `- Source: ${variable.persistent ? "Persistent user variable" : variable.category}`,
    "## Value",
    `\`\`\`text\n${formattedValue}\n\`\`\``,
  ].join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!variable.readOnly && data ? (
            <Action.Push
              title="Edit Value"
              target={<VariableEditor variable={variable} btt={btt} initialValue={formattedValue} type={data.type} />}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
          ) : null}
          {!variable.readOnly && variable.persistent ? (
            <ClearVariableValueAction variable={variable} btt={btt} onCleared={revalidate} />
          ) : null}
          {data ? (
            <Action.CopyToClipboard
              title="Copy Value"
              content={formattedValue}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          <Action
            title="Refresh Value"
            onAction={revalidate}
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}

function LoadVariableEditor({ variable, btt }: { variable: VariableDefinition; btt: Btt }) {
  const { isLoading, data } = usePromise(loadVariableValue, [btt, variable.name], {
    failureToastOptions: { title: `Could not read ${variable.name}` },
  });

  if (isLoading || !data) return <Detail isLoading markdown={`# ${variable.name}`} />;

  return <VariableEditor variable={variable} btt={btt} initialValue={String(data.value)} type={data.type} />;
}

function VariableEditor({
  variable,
  btt,
  initialValue,
  type,
}: {
  variable: VariableDefinition;
  btt: Btt;
  initialValue: string;
  type: string;
}) {
  const { pop } = useNavigation();

  async function updateVariable(values: { value: string }) {
    const value = type === "number" ? Number(values.value) : values.value;
    if (type === "number" && !Number.isFinite(value)) {
      await showToast({ title: "Enter a valid number", style: Toast.Style.Failure });
      return;
    }

    try {
      await btt.vars.set(variable.name, value, { persistent: variable.persistent });
      await showToast({ title: "Variable updated", style: Toast.Style.Success });
      pop();
    } catch (error) {
      await showBttFailureToast(error, `Could not update ${variable.name}`);
    }
  }

  const { handleSubmit, itemProps } = useForm<{ value: string }>({
    initialValues: { value: initialValue },
    onSubmit: updateVariable,
    validation: {
      value: (value) =>
        type !== "number" || (value?.trim() && Number.isFinite(Number(value))) ? undefined : "Enter a valid number.",
    },
  });

  return (
    <Form
      navigationTitle={variable.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Value"
            onSubmit={handleSubmit}
            icon={Icon.Check}
            shortcut={Keyboard.Shortcut.Common.Save}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Type: ${type || "string"}${variable.persistent ? " · Persistent" : ""}`} />
      <Form.TextArea title="Value" autoFocus {...itemProps.value} />
    </Form>
  );
}

async function loadVariableDefinitions(): Promise<VariableDefinition[]> {
  const persistentNames = await readPersistentVariableNames();
  return mergeVariableDefinitions(persistentNames);
}

async function readPersistentVariableNames(): Promise<string[]> {
  try {
    await access(userVariablesPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const { stdout } = await execFileAsync("plutil", ["-convert", "json", "-o", "-", userVariablesPath]);
  return getPersistentVariableNames(JSON.parse(stdout) as unknown);
}

async function loadSetVariableData(btt: Btt, variables: VariableDefinition[]): Promise<SetVariableData> {
  const names = variables.filter((variable) => variable.persistent).map((variable) => variable.name);
  const values: SetVariableData["values"] = [];

  for (let index = 0; index < variables.length; index += variableValueBatchSize) {
    const batch = variables.slice(index, index + variableValueBatchSize);
    const batchValues = await Promise.all(
      batch.map(async (variable) => {
        try {
          const { value, type } = await loadVariableValue(btt, variable.name);
          return isVariableSet(variable, value, type) ? { name: variable.name, value } : undefined;
        } catch {
          return undefined;
        }
      }),
    );
    for (const result of batchValues) {
      if (!result) continue;
      if (!names.includes(result.name)) names.push(result.name);
      values.push(result);
    }
  }

  return { names, values };
}

async function loadVariableValue(btt: Btt, name: string) {
  const [value, declaredType] = await Promise.all([btt.vars.get(name), btt.getVariableType(name)]);
  return { value, type: (declaredType || typeof value).toLowerCase() };
}
