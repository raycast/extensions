import {
  ActionPanel,
  Action,
  List,
  open,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Keyboard,
  closeMainWindow,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { Btt, type TriggerJson } from "bettertouchtool";
import { createBttClient } from "./btt";

export default function Command() {
  const [showDisabledTriggers, setShowDisabledTriggers] = useState(false);
  const btt = useMemo(createBttClient, []);
  const { isLoading, data, revalidate } = usePromise(
    (client: Btt) => client.getTriggers<BTTTrigger>({ triggerId: 643 }),
    [btt],
    { failureToastOptions: { title: "Could not load named triggers" } }
  );
  const commands = (data ?? []).filter(
    (trigger) =>
      !!trigger.BTTTriggerName && (showDisabledTriggers || (trigger.BTTEnabled === 1 && trigger.BTTEnabled2 === 1))
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search named triggers..."
      searchBarAccessory={<TriggerDropdown onTriggerTypeChange={(showAll) => setShowDisabledTriggers(!!showAll)} />}
      throttle
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title="Results" subtitle={commands?.length + ""}>
        {commands?.map((triggerResult) => (
          <TriggerItem key={triggerResult.BTTUUID} triggerResult={triggerResult} btt={btt} />
        ))}
      </List.Section>
    </List>
  );
}

function TriggerDropdown({ onTriggerTypeChange }: { onTriggerTypeChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Determine if disabled triggers should be shown" onChange={onTriggerTypeChange}>
      <List.Dropdown.Item key="true" title="Show all triggers" value="true" icon={Icon.Eye} />
      <List.Dropdown.Item key="false" title="Only show enabled triggers" value="" icon={Icon.EyeDisabled} />
    </List.Dropdown>
  );
}

function TriggerItem({ triggerResult, btt }: { triggerResult: BTTTrigger; btt: Btt }) {
  const preferences: Preferences.Trigger = getPreferenceValues();
  const sharedSecret = preferences.bttSharedSecret;

  const triggerName = triggerResult.BTTTriggerName;
  const url = `btt://trigger_named/?trigger_name=${encodeURIComponent(triggerName)}${
    sharedSecret ? "&shared_secret=" + encodeURIComponent(sharedSecret) : ""
  }`;
  const handleTrigger = async () => {
    await open(url);
  };

  const handleRun = async () => {
    try {
      await btt.triggerNamed(triggerName);
    } catch (error) {
      showToast({
        title: "Failed to run trigger",
        message: error && String(error) !== "null" ? String(error) : "",
        style: Toast.Style.Failure,
      });
    }
  };

  const handleRunInBackground = async () => {
    await closeMainWindow();
    try {
      await btt.triggerNamedAsync(triggerName);
    } catch (error) {
      showToast({
        title: "Failed to run trigger",
        message: error && String(error) !== "null" ? String(error) : "",
        style: Toast.Style.Failure,
      });
    }
  };

  const accessories: List.Item.Accessory[] = [];
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
            <Action title="Run Trigger with BTT" onAction={handleRun} icon={Icon.PlayFilled} />
            <Action title="Run Trigger in Background" onAction={handleRunInBackground} icon={Icon.Play} />
            <Action
              title="Run Trigger with BTT via URL"
              onAction={handleTrigger}
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Trigger URL"
              content={url}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onCopy={() => console.log(triggerResult)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface BTTTrigger extends TriggerJson {
  BTTGestureNotes?: string;
  BTTTriggerName: string;
  BTTUUID: string;
}
