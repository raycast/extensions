import { Action, ActionPanel, Detail, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { useMemo, useState } from "react";
import { actions, ActionType, type Btt } from "bettertouchtool";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import { DevelopmentDiagnosticsSection } from "./diagnostics";
import { type VariableDefinition } from "./variable-definitions";
import {
  filterVariableDefinitions,
  getPersistentVariableNames,
  mergeVariableDefinitions,
  type VariableFilter,
} from "./variable-utils";

const execFileAsync = promisify(execFile);
const userVariablesPath = join(homedir(), "Library/Application Support/BetterTouchTool/btt_user_variables.plist");

export default function Command() {
  const [variableFilter, setVariableFilter] = useState<VariableFilter>("all");
  const btt = useMemo(createBttClient, []);
  const {
    isLoading,
    data = [],
    revalidate,
  } = usePromise(loadVariableDefinitions, [], {
    failureToastOptions: { title: "Could not load BTT variables" },
  });
  const filteredVariables = useMemo(() => filterVariableDefinitions(data, variableFilter), [data, variableFilter]);

  async function showAllVariablesInBtt() {
    try {
      await btt.triggerAction(actions.action(ActionType.SHOW_VARIABLES_VIEW));
    } catch (error) {
      await showBttFailureToast(error, "Could not open BTT Variables");
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search BTT variables..."
      searchBarAccessory={<VariableFilterDropdown value={variableFilter} onChange={setVariableFilter} />}
      throttle
      actions={
        <ActionPanel>
          <Action title="Refresh Variables" onAction={revalidate} icon={Icon.RotateClockwise} />
          <Action title="Show All Variables in BTT" onAction={showAllVariablesInBtt} icon={Icon.AppWindowList} />
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    >
      {filteredVariables.map((variable) => (
        <VariableItem key={variable.name} variable={variable} btt={btt} />
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
      <List.Dropdown.Item title="Dynamic" value="dynamic" />
      <List.Dropdown.Item title="Context" value="context" />
      <List.Dropdown.Item title="Persistent" value="persistent" />
    </List.Dropdown>
  );
}

function VariableItem({ variable, btt }: { variable: VariableDefinition; btt: Btt }) {
  return (
    <List.Item
      title={variable.name}
      subtitle={variable.description}
      keywords={[variable.category, variable.persistent ? "persistent" : "dynamic"]}
      accessories={[
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
              title="Change Value"
              target={<LoadVariableEditor variable={variable} btt={btt} />}
              icon={Icon.Pencil}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Variable Name" content={variable.name} />
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    />
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
              title="Change Value"
              target={<VariableEditor variable={variable} btt={btt} initialValue={formattedValue} type={data.type} />}
              icon={Icon.Pencil}
            />
          ) : null}
          {data ? <Action.CopyToClipboard title="Copy Value" content={formattedValue} /> : null}
          <Action title="Refresh Value" onAction={revalidate} icon={Icon.RotateClockwise} />
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

  async function handleSubmit(values: { value: string }) {
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

  return (
    <Form
      navigationTitle={variable.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Value" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Type: ${type || "string"}${variable.persistent ? " · Persistent" : ""}`} />
      <Form.TextArea id="value" title="Value" defaultValue={initialValue} autoFocus />
    </Form>
  );
}

async function loadVariableDefinitions(): Promise<VariableDefinition[]> {
  const persistentNames = await readPersistentVariableNames();
  return mergeVariableDefinitions(persistentNames);
}

async function readPersistentVariableNames(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("plutil", ["-convert", "json", "-o", "-", userVariablesPath]);
    return getPersistentVariableNames(JSON.parse(stdout) as unknown);
  } catch {
    return [];
  }
}

async function loadVariableValue(btt: Btt, name: string) {
  const [value, declaredType] = await Promise.all([btt.vars.get(name), btt.getVariableType(name)]);
  return { value, type: (declaredType || typeof value).toLowerCase() };
}
