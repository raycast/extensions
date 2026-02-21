import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { getBrowserIcon, getBrowserSubtitle, getBrowserTitle, getSelectableBrowserIdentifiers } from "../lib/browsers";
import { updateRuleBrowser } from "../lib/rules";
import { VeljaRule } from "../lib/types";
import { DEFAULT_BROWSER_MARKER, readVeljaConfig } from "../lib/velja";

export function RuleBrowserPicker(props: { rule: VeljaRule; onUpdated?: (updatedRule: VeljaRule) => void }) {
  const { rule, onUpdated } = props;
  const { pop } = useNavigation();
  let browserIdentifiers: string[] = [];

  try {
    const config = readVeljaConfig();
    browserIdentifiers = getSelectableBrowserIdentifiers(config.preferredBrowsers, {
      includePrompt: true,
      promptFirst: true,
      extraIdentifiers: rule.browser !== DEFAULT_BROWSER_MARKER ? [rule.browser] : [],
    });
  } catch {
    browserIdentifiers = [rule.browser];
  }

  async function handleRemap(identifier: string) {
    await showToast({ style: Toast.Style.Animated, title: "Updating target browser..." });

    try {
      const updatedRule = updateRuleBrowser(rule.id, identifier);
      onUpdated?.(updatedRule);
      await showToast({ style: Toast.Style.Success, title: "Updated rule browser target" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update rule browser",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List searchBarPlaceholder="Select rule target browser...">
      {browserIdentifiers.map((identifier) => (
        <List.Item
          key={identifier}
          title={getBrowserTitle(identifier)}
          subtitle={getBrowserSubtitle(identifier)}
          icon={getBrowserIcon(identifier)}
          accessories={identifier === rule.browser ? [{ tag: "Current" }] : []}
          actions={
            <ActionPanel>
              <Action title="Set Target Browser" icon={Icon.CheckCircle} onAction={() => handleRemap(identifier)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
