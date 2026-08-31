import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Keyboard,
  closeMainWindow,
  Clipboard,
  LocalStorage,
  Form,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { actions, Btt, type TriggerJson } from "bettertouchtool";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import { DevelopmentDiagnosticsSection } from "./diagnostics";
import {
  getNamedTriggerInputDefinitions,
  getNamedTriggerInputFieldId,
  parseNamedTriggerInputValues,
  type NamedTriggerInputDefinition,
} from "./named-trigger-inputs";
import {
  filterNamedTriggers,
  isTriggerEnabled,
  parseNamedTriggerReferences,
  type NamedTriggerReference,
  type TriggerFilter,
} from "./trigger-utils";

const namedTriggerCacheKey = "known-named-triggers";
const triggerFetchBatchSize = 8;

export default function Command() {
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("enabled");
  const btt = useMemo(createBttClient, []);
  const { triggerResultHandling } = getPreferenceValues<TriggerPreferences>();
  const { isLoading, data, revalidate } = usePromise(loadNamedTriggers, [btt], {
    failureToastOptions: { title: "Could not load named triggers" },
  });
  const commands = filterNamedTriggers(data ?? [], triggerFilter);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search named triggers..."
      searchBarAccessory={<TriggerDropdown value={triggerFilter} onChange={setTriggerFilter} />}
      throttle
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel.Section>
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    >
      <List.Section title="Results" subtitle={commands?.length + ""}>
        {commands?.map((triggerResult) => (
          <TriggerItem
            key={triggerResult.BTTUUID}
            triggerResult={triggerResult}
            btt={btt}
            resultHandling={triggerResultHandling}
            onTriggerChanged={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function TriggerDropdown({ value, onChange }: { value: TriggerFilter; onChange: (value: TriggerFilter) => void }) {
  return (
    <List.Dropdown
      tooltip="Filter named triggers by status"
      value={value}
      onChange={(newValue) => onChange(newValue as TriggerFilter)}
    >
      <List.Dropdown.Item title="Enabled Triggers" value="enabled" icon={Icon.CheckCircle} />
      <List.Dropdown.Item title="Disabled Triggers" value="disabled" icon={Icon.XMarkCircle} />
      <List.Dropdown.Item title="All Triggers" value="all" icon={Icon.List} />
    </List.Dropdown>
  );
}

function TriggerItem({
  triggerResult,
  btt,
  resultHandling,
  onTriggerChanged,
}: {
  triggerResult: BTTTrigger;
  btt: Btt;
  resultHandling: TriggerResultHandling;
  onTriggerChanged: () => Promise<unknown>;
}) {
  const triggerName = triggerResult.BTTTriggerName;
  const triggerHandle = btt.trigger(triggerResult.BTTUUID);
  const enabled = isTriggerEnabled(triggerResult);
  const inputDefinitions = getNamedTriggerInputDefinitions(triggerResult.BTTCustomContextMenuItemConfig);

  const handleRun = async () => {
    try {
      const result = await triggerHandle.invoke();
      await handleTriggerResult(result, resultHandling);
    } catch (error) {
      await showBttFailureToast(error, "Failed to run trigger");
    }
  };

  const handleRunInBackground = async () => {
    await closeMainWindow();
    try {
      await btt.triggerNamedAsync(triggerName);
    } catch (error) {
      await showBttFailureToast(error, "Failed to run trigger");
    }
  };

  const handleReveal = async () => {
    try {
      await triggerHandle.reveal();
    } catch (error) {
      await showBttFailureToast(error, "Could not show trigger in BetterTouchTool");
    }
  };

  const handleToggleEnabled = async () => {
    try {
      if (enabled) {
        await triggerHandle.disable();
      } else {
        await triggerHandle.enable();
      }
      await showToast({ title: enabled ? "Trigger disabled" : "Trigger enabled", style: Toast.Style.Success });
      await onTriggerChanged();
    } catch (error) {
      await showBttFailureToast(error, enabled ? "Could not disable trigger" : "Could not enable trigger");
    }
  };

  const accessories: List.Item.Accessory[] = [];
  if (!enabled) accessories.push({ tag: "Disabled" });
  if (triggerResult.BTTGestureNotes && triggerResult.BTTGestureNotes !== "Named Trigger: " + triggerName) {
    accessories.push({ text: triggerResult.BTTGestureNotes, icon: Icon.Info, tooltip: triggerResult.BTTGestureNotes });
  }
  if (triggerResult.BTTPredefinedActionName) {
    const actionConfig = triggerResult.BTTGenericActionConfig;
    accessories.push({
      text: triggerResult.BTTPredefinedActionName,
      icon: Icon.ArrowRight,
      tooltip:
        typeof actionConfig === "string"
          ? actionConfig
          : actionConfig
            ? JSON.stringify(actionConfig)
            : triggerResult.BTTPredefinedActionName,
    });
  }

  return (
    <List.Item
      title={triggerName}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {inputDefinitions.length > 0 ? (
              <Action.Push
                title="Configure and Run Trigger"
                target={
                  <NamedTriggerInputForm
                    triggerName={triggerName}
                    definitions={inputDefinitions}
                    btt={btt}
                    resultHandling={resultHandling}
                  />
                }
                icon={Icon.List}
              />
            ) : (
              <>
                <Action title="Run Trigger with BTT" onAction={handleRun} icon={Icon.PlayFilled} />
                <Action title="Run Trigger in Background" onAction={handleRunInBackground} icon={Icon.Play} />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="BetterTouchTool">
            <Action
              title="Show in BetterTouchTool"
              onAction={handleReveal}
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action
              title={enabled ? "Disable Trigger" : "Enable Trigger"}
              onAction={handleToggleEnabled}
              icon={enabled ? Icon.XMarkCircle : Icon.CheckCircle}
              shortcut={enabled ? { modifiers: ["cmd"], key: "d" } : undefined}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Trigger Name"
              content={triggerName}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    />
  );
}

interface BTTTrigger extends TriggerJson {
  BTTCustomContextMenuItemConfig?: unknown;
  BTTGestureNotes?: string;
  BTTTriggerName: string;
  BTTUUID: string;
}

interface TriggerPreferences {
  triggerResultHandling: TriggerResultHandling;
}

type TriggerResultHandling = "clipboard" | "ignore" | "toast";

function NamedTriggerInputForm({
  triggerName,
  definitions,
  btt,
  resultHandling,
}: {
  triggerName: string;
  definitions: NamedTriggerInputDefinition[];
  btt: Btt;
  resultHandling: TriggerResultHandling;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Record<string, string>) {
    const parsed = parseNamedTriggerInputValues(definitions, values);
    if (!parsed.success) {
      await showToast({ title: parsed.error, style: Toast.Style.Failure });
      return;
    }

    try {
      const variables = Object.fromEntries(
        Object.entries(parsed.variables).map(([name, value]) => [name, String(value)]),
      );
      const result = await btt.triggerAction(actions.triggerNamed(triggerName, variables));
      await handleTriggerResult(result, resultHandling);
      pop();
    } catch (error) {
      await showBttFailureToast(error, "Failed to run trigger");
    }
  }

  return (
    <Form
      navigationTitle={triggerName}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Trigger" onSubmit={handleSubmit} icon={Icon.PlayFilled} />
        </ActionPanel>
      }
    >
      <Form.Description title={triggerName} text="Enter the variables declared by this named trigger." />
      <Form.Separator />
      {definitions.map((definition, index) => {
        const fieldId = getNamedTriggerInputFieldId(index);
        if (definition.options.length > 0) {
          return (
            <Form.Dropdown
              key={fieldId}
              id={fieldId}
              title={definition.name}
              info={definition.description}
              defaultValue={definition.options[0]}
            >
              {definition.options.map((option, optionIndex) => (
                <Form.Dropdown.Item key={`${optionIndex}-${option}`} title={option} value={option} />
              ))}
            </Form.Dropdown>
          );
        }

        return (
          <Form.TextField
            key={fieldId}
            id={fieldId}
            title={definition.name}
            info={definition.description ?? (definition.type === "number" ? "Number" : "Text")}
            placeholder={definition.type === "number" ? "Enter a number" : "Enter text"}
          />
        );
      })}
    </Form>
  );
}

async function loadNamedTriggers(btt: Btt): Promise<BTTTrigger[]> {
  const listedTriggers = await btt.getTriggers<BTTTrigger>({ triggerId: 643 });
  const cachedReferences = parseNamedTriggerReferences(await LocalStorage.getItem(namedTriggerCacheKey));
  const triggersByUuid = new Map(listedTriggers.map((trigger) => [trigger.BTTUUID, trigger]));
  const missingReferences = cachedReferences.filter(({ uuid }) => !triggersByUuid.has(uuid));

  for (let index = 0; index < missingReferences.length; index += triggerFetchBatchSize) {
    const batch = missingReferences.slice(index, index + triggerFetchBatchSize);
    const recoveredTriggers = await Promise.all(batch.map(({ uuid }) => loadTriggerIfAvailable(btt, uuid)));
    for (const trigger of recoveredTriggers) {
      if (trigger) triggersByUuid.set(trigger.BTTUUID, trigger);
    }
  }

  const triggers = [...triggersByUuid.values()];
  const references: NamedTriggerReference[] = triggers.map(({ BTTTriggerName: name, BTTUUID: uuid }) => ({
    name,
    uuid,
  }));
  await LocalStorage.setItem(namedTriggerCacheKey, JSON.stringify(references));
  return triggers;
}

async function loadTriggerIfAvailable(btt: Btt, uuid: string): Promise<BTTTrigger | undefined> {
  try {
    const trigger = await btt.getTrigger<BTTTrigger>(uuid);
    return trigger.BTTUUID && trigger.BTTTriggerName ? trigger : undefined;
  } catch {
    return undefined;
  }
}

async function handleTriggerResult(result: string, handling: TriggerResultHandling) {
  if (!result || handling === "ignore") return;

  if (handling === "clipboard") {
    await Clipboard.copy(result);
    await showToast({ title: "Trigger result copied", style: Toast.Style.Success });
    return;
  }

  await showToast({
    title: "Trigger completed",
    message: result.length > 200 ? `${result.slice(0, 197)}...` : result,
    style: Toast.Style.Success,
  });
}
