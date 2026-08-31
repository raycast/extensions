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
} from "@raycast/api";
import { useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { Btt, type TriggerJson } from "bettertouchtool";
import { createBttClient } from "./btt";
import { showBttFailureToast } from "./btt-toast";
import { DevelopmentDiagnosticsSection } from "./diagnostics";
import { filterNamedTriggers, isTriggerEnabled } from "./trigger-utils";

export default function Command() {
  const [showDisabledTriggers, setShowDisabledTriggers] = useState(false);
  const btt = useMemo(createBttClient, []);
  const { triggerResultHandling } = getPreferenceValues<TriggerPreferences>();
  const { isLoading, data, revalidate } = usePromise(
    (client: Btt) => client.getTriggers<BTTTrigger>({ triggerId: 643 }),
    [btt],
    { failureToastOptions: { title: "Could not load named triggers" } },
  );
  const commands = filterNamedTriggers(data ?? [], showDisabledTriggers);

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

function TriggerDropdown({ onTriggerTypeChange }: { onTriggerTypeChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Determine if disabled triggers should be shown" onChange={onTriggerTypeChange}>
      <List.Dropdown.Item key="true" title="Show all triggers" value="true" icon={Icon.List} />
      <List.Dropdown.Item key="false" title="Only show enabled triggers" value="" icon={Icon.CheckCircle} />
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
            <Action title="Run Trigger with BTT" onAction={handleRun} icon={Icon.PlayFilled} />
            <Action title="Run Trigger in Background" onAction={handleRunInBackground} icon={Icon.Play} />
          </ActionPanel.Section>
          <ActionPanel.Section title="BetterTouchTool">
            <Action title="Show in BetterTouchTool" onAction={handleReveal} icon={Icon.AppWindow} />
            <Action
              title={enabled ? "Disable Trigger" : "Enable Trigger"}
              onAction={handleToggleEnabled}
              icon={enabled ? Icon.XMarkCircle : Icon.CheckCircle}
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
  BTTGestureNotes?: string;
  BTTTriggerName: string;
  BTTUUID: string;
}

interface TriggerPreferences {
  triggerResultHandling: TriggerResultHandling;
}

type TriggerResultHandling = "clipboard" | "ignore" | "toast";

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
