import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { disable } from "./lib/session";
import { isUserCancelled } from "./lib/labels";
import { installRule, isRuleInstalled, isSleepDisabled, removeRule } from "./lib/system";

const EXPLANATION = `Adds a sudoers rule for your user, which lets you run only \`pmset -a disablesleep 0\` and \`pmset -a disablesleep 1\` as root without a password. macOS asks for your admin password once, when you install or remove it.\n\nWith the rule installed, Doorstopper no longer asks for Touch ID or your password, and it can disable itself when a timer ends, the battery is low, or the Mac restarts.`;

export default function Command() {
  const { data: installed, isLoading, revalidate } = usePromise(isRuleInstalled);

  async function install() {
    try {
      await installRule();
      await showToast({ style: Toast.Style.Success, title: "Passwordless toggle installed" });
      revalidate();
    } catch (error) {
      if (isUserCancelled(error)) {
        await showToast({ title: "Setup cancelled" });
        return;
      }
      await showFailureToast(error, { title: "Could not install the passwordless toggle" });
    }
  }

  async function remove() {
    try {
      if (await isSleepDisabled()) {
        await disable();
      }
      await removeRule();
      await showToast({ style: Toast.Style.Success, title: "Passwordless toggle removed" });
      revalidate();
    } catch (error) {
      if (isUserCancelled(error)) {
        await showToast({ title: "Setup cancelled" });
        return;
      }
      await showFailureToast(error, { title: "Could not remove the passwordless toggle" });
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Item
        title={installed ? "Passwordless toggle is installed" : "Passwordless toggle is not installed"}
        subtitle={installed ? "Remove it to require a password again" : "Asks for your admin password once"}
        icon={installed ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.XMarkCircle }}
        detail={<List.Item.Detail markdown={EXPLANATION} />}
        actions={
          <ActionPanel>
            {installed ? (
              <Action
                title="Remove Passwordless Toggle"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={remove}
              />
            ) : (
              <Action title="Install Passwordless Toggle" icon={Icon.Lock} onAction={install} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
