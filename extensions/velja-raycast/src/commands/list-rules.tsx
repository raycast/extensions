import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { RuleBrowserPicker } from "../components/rule-browser-picker";
import { RuleDetailView } from "../components/rule-detail";
import { getBrowserIcon, getBrowserTitle } from "../lib/browsers";
import { deleteRule, listRules, toggleRule } from "../lib/rules";
import { VeljaRule } from "../lib/types";

export default function Command() {
  const { push } = useNavigation();
  const [rules, setRules] = useState<VeljaRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reloadRules() {
    try {
      setRules(listRules());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load rules",
        message: error instanceof Error ? error.message : String(error),
      });
      setRules([]);
    }
  }

  useEffect(() => {
    reloadRules().finally(() => setIsLoading(false));
  }, []);

  async function handleToggleRule(rule: VeljaRule) {
    await showToast({ style: Toast.Style.Animated, title: "Updating rule..." });

    try {
      const updatedRule = toggleRule(rule.id);
      setRules((existing) => existing.map((item) => (item.id === updatedRule.id ? updatedRule : item)));
      await showToast({
        style: Toast.Style.Success,
        title: `${updatedRule.isEnabled ? "Enabled" : "Disabled"} rule`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update rule",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDeleteRule(rule: VeljaRule) {
    const confirmed = await confirmAlert({
      title: `Delete "${rule.title}"?`,
      message: "This cannot be undone.",
      primaryAction: {
        title: "Delete Rule",
      },
    });

    if (!confirmed) {
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Deleting rule..." });

    try {
      deleteRule(rule.id);
      setRules((existing) => existing.filter((item) => item.id !== rule.id));
      await showToast({ style: Toast.Style.Success, title: "Deleted rule" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete rule",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Velja rules...">
      {rules.map((rule) => (
        <List.Item
          key={rule.id}
          title={rule.title}
          subtitle={getBrowserTitle(rule.browser)}
          icon={getBrowserIcon(rule.browser)}
          accessories={[{ tag: rule.isEnabled ? "Enabled" : "Disabled" }, { text: `${rule.matchers.length} matchers` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Remap Target Browser"
                icon={Icon.Pencil}
                target={
                  <RuleBrowserPicker
                    rule={rule}
                    onUpdated={(updatedRule) =>
                      setRules((existing) => existing.map((item) => (item.id === updatedRule.id ? updatedRule : item)))
                    }
                  />
                }
              />
              <Action title="View Details" icon={Icon.Eye} onAction={() => push(<RuleDetailView rule={rule} />)} />
              <Action
                title={rule.isEnabled ? "Disable Rule" : "Enable Rule"}
                icon={rule.isEnabled ? Icon.Pause : Icon.Play}
                onAction={() => handleToggleRule(rule)}
              />
              <Action
                title="Delete Rule"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteRule(rule)}
              />
              <Action
                title="Copy Rule JSON"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(JSON.stringify(rule, null, 2));
                  await showToast({ style: Toast.Style.Success, title: "Copied rule JSON" });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
