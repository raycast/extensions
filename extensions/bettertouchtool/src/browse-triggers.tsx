import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { type Btt, type TriggerJson } from "bettertouchtool";
import { triggerCatalog } from "bettertouchtool/catalog";
import {
  getConfiguredTriggers,
  getTriggerGroupPaths,
  getTriggerListMetadata,
  getTriggerParentGroupPath,
  type ConfiguredTrigger,
  type TriggerListMetadata,
} from "./all-trigger-utils";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import { DevelopmentDiagnosticsSection } from "./diagnostics";
import { isTriggerEnabled } from "./trigger-utils";

const allCategories = "all";

interface TriggerEntry {
  trigger: ConfiguredTrigger;
  metadata: TriggerListMetadata;
  group?: string;
}

export default function Command() {
  const btt = useMemo(createBttClient, []);
  const [category, setCategory] = useState(allCategories);
  const {
    isLoading,
    data = [],
    revalidate,
  } = usePromise(loadConfiguredTriggers, [btt], {
    failureToastOptions: { title: "Could not load BTT triggers" },
  });
  const entries = useMemo(() => createTriggerEntries(data), [data]);
  const categories = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.metadata.category))].sort((left, right) => left.localeCompare(right)),
    [entries],
  );
  const filteredEntries = useMemo(
    () => (category === allCategories ? entries : entries.filter((entry) => entry.metadata.category === category)),
    [category, entries],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search all BTT triggers..."
      searchBarAccessory={<CategoryDropdown categories={categories} value={category} onChange={setCategory} />}
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh Triggers"
            onAction={revalidate}
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    >
      <List.Section
        title={category === allCategories ? "All Triggers" : category}
        subtitle={String(filteredEntries.length)}
      >
        {filteredEntries.map((entry) => (
          <TriggerItem key={entry.trigger.BTTUUID} entry={entry} btt={btt} onTriggerChanged={revalidate} />
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
    <List.Dropdown tooltip="Filter by trigger category" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Categories" value={allCategories} icon={Icon.List} />
      {categories.map((category) => (
        <List.Dropdown.Item key={category} title={category} value={category} />
      ))}
    </List.Dropdown>
  );
}

function TriggerItem({
  entry,
  btt,
  onTriggerChanged,
}: {
  entry: TriggerEntry;
  btt: Btt;
  onTriggerChanged: () => Promise<unknown>;
}) {
  const { trigger, metadata, group } = entry;
  const triggerHandle = btt.trigger(trigger.BTTUUID);
  const enabled = isTriggerEnabled(trigger);
  const isGroup = Boolean(trigger.BTTGroupName);

  async function runTrigger(closeWindow: boolean) {
    if (closeWindow) await closeMainWindow();
    try {
      const result = await triggerHandle.invoke();
      await showToast({
        title: "Trigger completed",
        ...(result ? { message: result.length > 200 ? `${result.slice(0, 197)}...` : result } : {}),
        style: Toast.Style.Success,
      });
    } catch (error) {
      await showBttFailureToast(error, "Failed to run trigger");
    }
  }

  async function revealTrigger() {
    try {
      await triggerHandle.reveal();
    } catch (error) {
      await showBttFailureToast(error, "Could not show trigger in BetterTouchTool");
    }
  }

  async function toggleTrigger() {
    try {
      if (enabled) await triggerHandle.disable();
      else await triggerHandle.enable();
      await showToast({ title: enabled ? "Trigger disabled" : "Trigger enabled", style: Toast.Style.Success });
      await onTriggerChanged();
    } catch (error) {
      await showBttFailureToast(error, enabled ? "Could not disable trigger" : "Could not enable trigger");
    }
  }

  return (
    <List.Item
      id={trigger.BTTUUID}
      title={metadata.title}
      subtitle={metadata.subtitle}
      icon={isGroup ? Icon.Folder : Icon.CommandSymbol}
      keywords={[
        metadata.category,
        metadata.typeName,
        group,
        trigger.BTTBelongsToApp,
        trigger.BTTTriggerBelongsToPreset,
        trigger.BTTUUID,
      ].filter((value): value is string => Boolean(value))}
      accessories={[
        ...(!enabled ? [{ tag: "Disabled" }] : []),
        ...(group ? [{ text: group, icon: Icon.Folder }] : []),
        ...(trigger.BTTBelongsToApp ? [{ text: trigger.BTTBelongsToApp, icon: Icon.AppWindow }] : []),
        ...(trigger.BTTTriggerBelongsToPreset ? [{ tag: trigger.BTTTriggerBelongsToPreset }] : []),
      ]}
      actions={
        <ActionPanel>
          {!isGroup ? (
            <ActionPanel.Section>
              <Action title="Run Trigger with BTT" onAction={() => runTrigger(false)} icon={Icon.PlayFilled} />
              <Action title="Run Trigger in Background" onAction={() => runTrigger(true)} icon={Icon.Play} />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="BetterTouchTool">
            <Action
              title="Show in BetterTouchTool"
              onAction={revealTrigger}
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action
              title={enabled ? "Disable Trigger" : "Enable Trigger"}
              onAction={toggleTrigger}
              icon={enabled ? Icon.XMarkCircle : Icon.CheckCircle}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Trigger UUID"
              content={trigger.BTTUUID}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <DevelopmentDiagnosticsSection />
        </ActionPanel>
      }
    />
  );
}

async function loadConfiguredTriggers(btt: Btt): Promise<ConfiguredTrigger[]> {
  return getConfiguredTriggers(await btt.getTriggers<TriggerJson>());
}

function createTriggerEntries(triggers: ConfiguredTrigger[]): TriggerEntry[] {
  const groupPaths = getTriggerGroupPaths(triggers);
  return triggers
    .map((trigger) => ({
      trigger,
      metadata: getTriggerListMetadata(trigger, triggerCatalog.all),
      group: getTriggerParentGroupPath(trigger, groupPaths),
    }))
    .sort(
      (left, right) =>
        left.metadata.category.localeCompare(right.metadata.category) ||
        left.metadata.title.localeCompare(right.metadata.title),
    );
}
