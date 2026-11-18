import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { DdosProtectionEvent, DdosProtectionRule, FastlyService } from "../types";
import { getDdosEventRules, updateDdosRuleAction } from "../api";
import {
  DDOS_RULE_ACTIONS,
  confirmDdosRuleActionChange,
  ddosRuleActionTag,
  ddosRuleAttributes,
} from "../utils/ddos-rules";

interface DdosEventRulesProps {
  event: DdosProtectionEvent;
  service: FastlyService;
}

export function DdosEventRules({ event, service }: DdosEventRulesProps) {
  const [rules, setRules] = useState<DdosProtectionRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      setIsLoading(true);
      const allRules: DdosProtectionRule[] = [];
      let cursor: string | undefined;
      let pages = 0;

      do {
        const response = await getDdosEventRules(event.id, cursor);
        allRules.push(...(response.data || []));
        cursor = response.meta?.next_cursor || undefined;
        pages += 1;
      } while (cursor && pages < 10);

      setRules(allRules);
    } catch (error) {
      console.error("Error loading DDoS rules:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load mitigation rules",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetAction(rule: DdosProtectionRule, action: string) {
    if (action === rule.action) {
      return;
    }
    if (!(await confirmDdosRuleActionChange(rule, action))) {
      return;
    }
    try {
      const updated = await updateDdosRuleAction(rule.id, action);
      await showToast({
        style: Toast.Style.Success,
        title: `Rule action set to ${action}`,
        message: rule.name || rule.id,
      });
      // The PATCH returns the updated rule; no need to re-fetch the whole list
      setRules((current) => current.map((r) => (r.id === rule.id ? { ...r, ...updated, action } : r)));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update rule",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Rules — ${event.name || event.id}`}
      searchBarPlaceholder="Search mitigation rules..."
    >
      {rules.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Mitigation Rules"
          description="No rules were generated for this event."
          icon={Icon.List}
        />
      ) : (
        rules.map((rule) => {
          const attributes = ddosRuleAttributes(rule);
          const accessories: List.Item.Accessory[] = [];
          if (rule.traffic_percentage != null) {
            accessories.push({
              text: `${rule.traffic_percentage}%`,
              tooltip: "Share of the event's traffic matching this rule",
            });
          }
          accessories.push(ddosRuleActionTag(rule.action));

          return (
            <List.Item
              key={rule.id}
              title={rule.name || rule.id}
              subtitle={attributes.join(" · ")}
              keywords={attributes}
              icon={Icon.Fingerprint}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Submenu title="Set Rule Action" icon={Icon.Pencil}>
                    {DDOS_RULE_ACTIONS.map((action) => (
                      <Action
                        key={action.value}
                        title={action.title}
                        icon={action.icon}
                        onAction={() => handleSetAction(rule, action.value)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action.CopyToClipboard
                    title="Copy Rule ID"
                    content={rule.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                  <Action.OpenInBrowser
                    title="Open Service in Fastly"
                    url={`https://manage.fastly.com/configure/services/${service.id}`}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadRules}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
