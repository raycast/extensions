import { ActionPanel, Action, List, open, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { useExec } from "@raycast/utils";
import { exec } from "child_process";

export default function Command() {
  const [commands, setCommands] = useState<BTTTrigger[]>([]);
  const [showDisabledTriggers, setShowDisabledTriggers] = useState(false);
  const preferences: Preferences.Trigger = getPreferenceValues();
  const shared_secret = preferences.bttSharedSecret;
  const sharedSecretString = shared_secret ? `{ shared_secret: "${shared_secret}"}` : "";
  const namedTriggerId = 643;
  const applicationName = "BetterTouchTool";
  const getTriggersJXA = `function run(argv) {
    let btt = Application('${applicationName}');
    if (!Application('${applicationName}').running()) {
      return "error: ${applicationName} is not running. Please launch BTT to use this extension!";
    }
    try {
      return btt.get_triggers(${
        namedTriggerId
          ? `{trigger_id: ${namedTriggerId}${shared_secret ? ", ..." + sharedSecretString : ""} }`
          : sharedSecretString
      });
    } catch (e) {
      return "error: Could not run JXA script. Is BTT running?";
    }

  } run();`;

  const { isLoading, data, revalidate } = useExec("osascript", ["-l", "JavaScript", "-e", getTriggersJXA], { onError: console.error }  );

  const checkError = (data: string) => {
    if (!data || data === "null" || data.includes("error:")) {
      const errorMessage =
        data === "null"
          ? "No data returned from BTT. Have you configured a shared secret?"
          : data.replace("error:", "").trim() || "Unknown error";
      const [part1, part2] = errorMessage.split(". ");
      showToast({
        title: part1 || "Error",
        message: (part1 && part2) || "",
        style: Toast.Style.Failure,
      });
      return true;
    }
    return null;
  };

  useEffect(() => {
    if (!isLoading && data && !checkError(data || "")) {
      try {
        const jsonData = JSON.parse(data);

        const filteredTriggers = jsonData.filter(
          (trigger: BTTTrigger) =>
            !!trigger.BTTTriggerName &&
            (showDisabledTriggers || (trigger.BTTEnabled === 1 && trigger.BTTEnabled2 === 1))
        );

        setCommands(filteredTriggers);
      } catch (error) {
        checkError("error: Failed to parse triggers. Have you created a named trigger?");
      }
    }
  }, [isLoading, data, showDisabledTriggers]);

  const TriggerDropdown = ({ onTriggerTypeChange }: { onTriggerTypeChange: (value: string) => void }) => {
    return (
      <List.Dropdown tooltip="Determine if disabled triggers should be shown" onChange={onTriggerTypeChange}>
        <List.Dropdown.Item key="true" title={"Show all triggers"} value={"true"} icon={Icon.Eye} />
        <List.Dropdown.Item key="false" title={"Only show enabled triggers"} value={""} icon={Icon.EyeDisabled} />
      </List.Dropdown>
    );
  };
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
          <TriggerItem key={triggerResult.BTTUUID} triggerResult={triggerResult} />
        ))}
      </List.Section>
    </List>
  );
}

function TriggerItem({ triggerResult }: { triggerResult: BTTTrigger }) {
  const triggerName = triggerResult.BTTTriggerName || triggerResult.BTTPredefinedActionName;
  const url = `btt://trigger_named/?trigger_name=${encodeURIComponent(triggerName)}`;
  const handleTrigger = async () => {
    await open(url);
  };

  const handleRun = async () => {
    const osaCommand = `tell application "BetterTouchTool" to trigger_named "${triggerName}"`;
    await exec(`osascript -e '${osaCommand}'`, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
    });
  };

  const accessories = []
  if (triggerResult.BTTGestureNotes && triggerResult.BTTGestureNotes !== "Named Trigger: " + triggerName) {

  }
  return (
    <List.Item
      title={triggerName}
      accessories={[
        ...(
          ? [{ text: triggerResult.BTTGestureNotes, icon: Icon.Info, tooltip: triggerResult.BTTGestureNotes }]
          : []),

        {
          text: triggerResult.BTTPredefinedActionName,
          icon: Icon.ArrowRight,
          tooltip: triggerResult.BTTGenericActionConfig || triggerResult.BTTPredefinedActionName,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Run Trigger with BTT" onAction={handleRun} icon={Icon.Play} />
            <Action title="Run Trigger with BTT via URL" onAction={handleTrigger} icon={Icon.Link} />
            <Action.CopyToClipboard
              title="Copy Trigger URL"
              content={url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onCopy={() => console.log(triggerResult)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface BTTTrigger {
  BTTTriggerType: number;
  BTTTriggerTypeDescription?: string;
  BTTGestureNotes?: string;
  BTTTriggerClass: string;
  BTTPredefinedActionType: number;
  BTTPredefinedActionName: string;
  BTTGenericActionConfig?: string;
  BTTNamedTriggerToTrigger?: string;
  BTTTriggerName: string;
  BTTEnabled2: number;
  BTTAlternateModifierKeys: string;
  BTTRepeatDelay: string;
  BTTUUID: string;
  BTTNotesInsteadOfDescription: string;
  BTTEnabled: number;
  BTTModifierMode: string;
  BTTOrder: string;
  BTTDisplayOrder: string;
  BTTKeySequence: object;
}
