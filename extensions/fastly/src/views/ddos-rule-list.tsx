import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { DdosProtectionEvent, DdosProtectionRule, FastlyService } from "../types";
import { getDdosEvents, getDdosEventRules, getServices, updateDdosRuleAction } from "../api";
import {
  DDOS_RULE_ACTIONS,
  confirmDdosRuleActionChange,
  ddosRuleActionTag,
  ddosRuleAttributes,
} from "../utils/ddos-rules";

// The API only exposes rules per event, so the account-wide view aggregates
// rules across recent events. Bounds keep the request fan-out reasonable.
const EVENT_LOOKBACK_DAYS = 90;
const MAX_EVENT_PAGES = 3;
const MAX_EVENTS_FOR_RULES = 50;

interface DdosRuleListProps {
  // When set, only rules from this service's events are shown
  service?: FastlyService;
}

interface AggregatedRule {
  rule: DdosProtectionRule;
  eventCount: number;
  firstSeen?: string;
  lastSeen?: string;
}

const ACTION_FILTERS = [
  { id: "all", title: "All Actions" },
  { id: "default", title: "Default" },
  { id: "block", title: "Block" },
  { id: "log", title: "Log" },
  { id: "off", title: "Off" },
];

function eventTimestamp(event: DdosProtectionEvent): string | undefined {
  return event.started_at || event.created_at || undefined;
}

export function DdosRuleList({ service }: DdosRuleListProps) {
  const [rules, setRules] = useState<AggregatedRule[]>([]);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [actionFilter, setActionFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      setIsLoading(true);

      const namesPromise = service ? Promise.resolve([service]) : getServices().catch(() => [] as FastlyService[]);

      // Collect recent events, newest first
      const from = new Date(Date.now() - EVENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const events: DdosProtectionEvent[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const response = await getDdosEvents({ serviceId: service?.id, from, cursor });
        events.push(...(response.data || []));
        cursor = response.meta?.next_cursor || undefined;
        pages += 1;
      } while (cursor && pages < MAX_EVENT_PAGES);

      events.sort((a, b) => (eventTimestamp(b) || "").localeCompare(eventTimestamp(a) || ""));
      const recentEvents = events.slice(0, MAX_EVENTS_FOR_RULES);

      const rulesPerEvent = await Promise.all(
        recentEvents.map((event) =>
          getDdosEventRules(event.id)
            .then((response) => ({ event, rules: response.data || [] }))
            .catch(() => ({ event, rules: [] as DdosProtectionRule[] })),
        ),
      );

      const byRule = new Map<string, AggregatedRule>();
      for (const { event, rules: eventRules } of rulesPerEvent) {
        const timestamp = eventTimestamp(event);
        for (const rule of eventRules) {
          const existing = byRule.get(rule.id);
          if (existing) {
            existing.eventCount += 1;
            if (timestamp && (!existing.firstSeen || timestamp < existing.firstSeen)) existing.firstSeen = timestamp;
            if (timestamp && (!existing.lastSeen || timestamp > existing.lastSeen)) existing.lastSeen = timestamp;
          } else {
            byRule.set(rule.id, { rule, eventCount: 1, firstSeen: timestamp, lastSeen: timestamp });
          }
        }
      }

      setRules([...byRule.values()].sort((a, b) => (b.lastSeen || "").localeCompare(a.lastSeen || "")));
      setServiceNames(Object.fromEntries((await namesPromise).map((s) => [s.id, s.name])));
    } catch (error) {
      console.error("Error loading DDoS rules:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load DDoS rules",
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
      // The PATCH returns the updated rule; avoid re-running the event fan-out
      setRules((current) =>
        current.map((entry) =>
          entry.rule.id === rule.id ? { ...entry, rule: { ...entry.rule, ...updated, action } } : entry,
        ),
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update rule",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const visibleRules = rules.filter(
    (entry) => actionFilter === "all" || (entry.rule.action || "default") === actionFilter,
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={service ? `DDoS Rules — ${service.name}` : "DDoS Rules"}
      searchBarPlaceholder="Search rules by ID or attribute..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Action" value={actionFilter} onChange={setActionFilter}>
          {ACTION_FILTERS.map((filter) => (
            <List.Dropdown.Item key={filter.id} value={filter.id} title={filter.title} />
          ))}
        </List.Dropdown>
      }
    >
      {visibleRules.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No DDoS Rules Found"
          description={`No mitigation rules were generated in the last ${EVENT_LOOKBACK_DAYS} days.`}
          icon={Icon.List}
        />
      ) : (
        visibleRules.map(({ rule, eventCount, firstSeen, lastSeen }) => {
          const attributes = ddosRuleAttributes(rule);
          const accessories: List.Item.Accessory[] = [];

          if (!service && rule.service_id) {
            accessories.push({
              text: serviceNames[rule.service_id] || rule.service_id,
              tooltip: "Service",
            });
          }
          accessories.push({
            text: `${eventCount} ${eventCount === 1 ? "event" : "events"}`,
            tooltip: firstSeen ? `First seen: ${new Date(firstSeen).toLocaleString()}` : undefined,
          });
          if (lastSeen) {
            accessories.push({
              date: new Date(lastSeen),
              tooltip: `Last seen: ${new Date(lastSeen).toLocaleString()}`,
            });
          }
          accessories.push(ddosRuleActionTag(rule.action));

          return (
            <List.Item
              key={rule.id}
              title={rule.name || rule.id}
              subtitle={attributes.join(" · ")}
              keywords={[rule.id, ...attributes]}
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
