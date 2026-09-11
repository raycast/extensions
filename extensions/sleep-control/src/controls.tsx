import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { changeQuickSwitching, changeSleepState, readSleepState } from "./lib/power";
import { presentation, refreshMenuBar, reportError } from "./lib/ui";

export default function SleepControls(props: LaunchProps<{ launchContext: { permissions?: boolean } }>) {
  const { data, error, isLoading, revalidate } = usePromise(readSleepState);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(props.launchContext?.permissions ? "permissions" : "state");
  const look = presentation(data, Boolean(error));
  const known = data !== undefined && !error;

  async function toggle() {
    if (!known || busy) return;
    setBusy(true);
    try {
      await changeSleepState(!data.disabled);
      await revalidate();
      await refreshMenuBar();
      await showToast({
        style: Toast.Style.Success,
        title: data.disabled ? "Sleep allowed" : "Keeping your Mac awake",
      });
    } catch (failure) {
      await revalidate();
      await reportError(failure);
    } finally {
      setBusy(false);
    }
  }

  async function permission() {
    if (!known || busy) return;
    const enabled = !data.quickSwitchingInstalled;
    const approved = await confirmAlert({
      title: enabled ? "Enable Quick Switching?" : "Remove Quick Switching?",
      message: enabled
        ? "Allow your macOS account to run only the two sleep-toggle commands without a password. This permission is available to apps running as you. macOS will ask for administrator approval once."
        : "Future changes will use normal macOS administrator approval. This removes only Sleep Control’s permission and leaves the sleep setting unchanged.",
      primaryAction: {
        title: enabled ? "Continue" : "Remove Permission",
        style: enabled ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      },
    });
    if (!approved) return;
    setBusy(true);
    try {
      await changeQuickSwitching(enabled);
      await revalidate();
      await refreshMenuBar();
      await showToast({
        style: Toast.Style.Success,
        title: enabled ? "Quick switching set up" : "Quick switching removed",
      });
    } catch (failure) {
      await revalidate();
      await reportError(failure);
    } finally {
      setBusy(false);
    }
  }

  const refresh = (
    <Action
      title="Refresh Status"
      icon={Icon.ArrowClockwise}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
  return (
    <List
      isLoading={isLoading || busy}
      isShowingDetail
      selectedItemId={selected}
      onSelectionChange={(id) => id && setSelected(id)}
      searchBarPlaceholder="Sleep and quick switching"
    >
      <List.Section title="This Mac">
        <List.Item
          id="state"
          title={look.label}
          icon={{ source: look.icon, tintColor: look.color }}
          detail={
            <List.Item.Detail
              markdown={
                error
                  ? `# Couldn’t Read Sleep Status\n\n${error.message}\n\nPress ⌘R to try again.`
                  : !data
                    ? "# Checking Your Mac…"
                    : data.disabled
                      ? "# Staying Awake\n\nYour Mac is set to keep working with the lid open or closed, on battery or charger.\n\n**Allow Sleep** restores normal sleep behavior.\n\nAllow sleep before putting your Mac in a bag. Critical battery or thermal protection can still take precedence."
                      : "# Sleep Allowed\n\nYour Mac follows its normal sleep settings.\n\n**Prevent Sleep** keeps it working with the lid open or closed, on battery or charger.\n\nThe display can still turn off. The setting remains until you change it again."
              }
            />
          }
          actions={
            <ActionPanel>
              {known && !busy ? (
                <Action title={look.action} icon={data.disabled ? Icon.Moon : Icon.Sun} onAction={toggle} />
              ) : null}
              {refresh}
              <Action title="Manage Quick Switching" icon={Icon.Lock} onAction={() => setSelected("permissions")} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Permissions">
        <List.Item
          id="permissions"
          title="Quick Switching"
          icon={Icon.Lock}
          accessories={[
            {
              tag: {
                value: data?.quickSwitchingInstalled ? "Set Up" : "Optional",
                color: data?.quickSwitchingInstalled ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={
                data?.quickSwitchingInstalled
                  ? "# Ready to Switch\n\nThe sleep-toggle permission is installed. Changing sleep won’t normally need another password. Your Mac’s security policy may still require approval.\n\nOnly the two exact sleep commands are allowed. Other administrator commands keep their existing permissions.\n\nYou can remove this permission here at any time. Removing it leaves your sleep setting unchanged."
                  : "# One Approval. Quick Switching.\n\nEnable quick switching to change sleep without repeated password prompts.\n\nmacOS will ask for administrator approval in a native dialog. Your password is never stored by Sleep Control.\n\nPermission covers only allowing or preventing sleep. It applies to your macOS account, including other apps running as you.\n\n**Prefer normal approval?** Leave this off. The sleep toggle still works using the macOS administrator dialog."
              }
            />
          }
          actions={
            <ActionPanel>
              {known && !busy ? (
                <Action
                  title={data.quickSwitchingInstalled ? "Remove Quick Switching" : "Enable Quick Switching"}
                  icon={data.quickSwitchingInstalled ? Icon.LockDisabled : Icon.LockUnlocked}
                  onAction={permission}
                />
              ) : null}
              {refresh}
              <Action title="Back to Sleep Controls" icon={Icon.Moon} onAction={() => setSelected("state")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
