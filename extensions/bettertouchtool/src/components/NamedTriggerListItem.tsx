import { NamedTrigger } from "../types";
import { runNamedTriggerAppleScript, runNamedTriggerUrl, runRevealInUI } from "../api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { getAppleScriptForNamedTrigger, getUrlForNamedTrigger } from "../helpers";

async function handleApplescript(trigger: NamedTrigger, onSuccess?: () => Promise<void>): Promise<void> {
  const result = await runNamedTriggerAppleScript(trigger.name);
  if (result.status === "success") {
    if (onSuccess) {
      await onSuccess();
    }
  } else {
    await showFailureToast(result.error, {
      title: "Failed to run trigger",
    });
  }
}

async function handleRevealInUI(uuid: string) {
  const result = await runRevealInUI(uuid);

  if (result.status === "error") {
    await showFailureToast(result.error, {
      primaryAction: {
        title: "Open BetterTouchTool Application",
        onAction: async () => {
          const osaCommand = 'tell application "BetterTouchTool" to reopen';
          try {
            await runAppleScript(osaCommand);
          } catch (error) {
            await showFailureToast("Failed to open BetterTouchTool");
          }
        },
      },
    });
  }
}

export function NamedTriggerListItem({
  trigger,
  defaultAction,
  visitItem,
}: {
  trigger: NamedTrigger;
  defaultAction: "url" | "applescript";
  visitItem: (item: NamedTrigger) => Promise<void>;
}) {
  const handleAppleScriptAction = () => handleApplescript(trigger, async () => await visitItem(trigger));

  const openUrl = (
    <Action
      key="open-url"
      /* eslint-disable-next-line @raycast/prefer-title-case */
      title="Trigger via URL Scheme"
      onAction={async () => {
        try {
          await runNamedTriggerUrl(trigger.name);
          await visitItem(trigger);
        } catch (error) {
          await showFailureToast("Failed to run trigger via URL");
        }
      }}
      icon={Icon.Link}
    />
  );

  const runApplescript = (
    <Action
      key="run-applescript"
      /* eslint-disable-next-line @raycast/prefer-title-case */
      title="Trigger via AppleScript"
      onAction={handleAppleScriptAction}
      icon={Icon.PlayFilled}
    />
  );

  const openInUI = (
    <Action
      key="open-in-ui"
      /* eslint-disable-next-line @raycast/prefer-title-case */
      title="Open in BetterTouchTool"
      icon={Icon.AppWindow}
      onAction={() => handleRevealInUI(trigger.uuid)}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );

  const primaryActions =
    defaultAction === "url" ? [openUrl, runApplescript, openInUI] : [runApplescript, openUrl, openInUI];

  const accessories = useMemo(() => {
    const actionCount = trigger.actions.length;
    const actionTooltip = trigger.actions
      .map((action) => `${action.enabled ? "" : "[Disabled] "}${action.name}`)
      .join("\n");

    const result: List.Item.Accessory[] = [
      { text: `${actionCount} action${actionCount === 1 ? "" : "s"}`, tooltip: actionTooltip },
    ];

    if (trigger.enabled) {
      result.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Enabled" });
    } else {
      result.push({ icon: { source: Icon.Circle }, tooltip: "Disabled" });
    }

    return result;
  }, [trigger.actions, trigger.enabled]);
  const triggerUrl = useMemo(() => getUrlForNamedTrigger(trigger.name), [trigger.name]);

  return (
    <List.Item
      title={trigger.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>{primaryActions}</ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Trigger URL"
            content={triggerUrl}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onCopy={() => visitItem(trigger)}
          />
          <Action.CopyToClipboard
            /* eslint-disable-next-line @raycast/prefer-title-case */
            title="Copy Trigger AppleScript"
            content={getAppleScriptForNamedTrigger(trigger.name)}
            icon={Icon.Terminal}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
            onCopy={() => visitItem(trigger)}
          />
          <Action.CreateQuicklink
            title="Create Quicklink"
            quicklink={{
              link: triggerUrl,
              name: `BTT: ${trigger.name}`,
              icon: Icon.CommandSymbol,
            }}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}
