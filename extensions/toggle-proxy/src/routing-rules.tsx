import {
  ActionPanel,
  Action,
  List,
  Form,
  Icon,
  Color,
  Alert,
  Clipboard,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import * as crypto from "crypto";
import { getSubscriptions, slugify, type Subscription } from "./utils/subscription";
import {
  RoutingRule,
  RuleTarget,
  RuleType,
  deleteSubRules,
  getSubRules,
  initializeSubRulesFromBaked,
  moveSubRule,
  saveSubRules,
} from "./utils/routing-rules";

const TARGET_COLOR: Record<RuleTarget, Color> = {
  direct: Color.Green,
  proxy: Color.Blue,
  block: Color.Red,
};

function iconForRule(r: RoutingRule) {
  const color = r.enabled ? TARGET_COLOR[r.target] : Color.SecondaryText;
  const source = r.target === "direct" ? Icon.ArrowRight : r.target === "proxy" ? Icon.Globe : Icon.XMarkCircle;
  return { source, tintColor: color };
}

export default function RoutingRulesCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rulesBySlug, setRulesBySlug] = useState<Record<string, RoutingRule[] | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const subs = await getSubscriptions();
    const entries = await Promise.all(
      subs.map(async (s) => [slugify(s.name), await getSubRules(slugify(s.name))] as const),
    );
    const map: Record<string, RoutingRule[] | null> = {};
    for (const [slug, rules] of entries) map[slug] = rules;
    setSubscriptions(subs);
    setRulesBySlug(map);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const customize = async (slug: string) => {
    await showToast(Toast.Style.Animated, "Importing baked-in rules…");
    await initializeSubRulesFromBaked(slug, prefs.xrayPath);
    await showToast(Toast.Style.Success, "Rules imported — edit freely");
    await load();
  };

  const revert = async (slug: string) => {
    const confirmed = await confirmAlert({
      title: "Revert to Defaults?",
      message: "The subscription will use the rules baked into its config files again. Your custom rules will be lost.",
      primaryAction: { title: "Revert", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteSubRules(slug);
    await showToast(Toast.Style.Success, "Reverted to baked-in rules");
    await load();
  };

  const toggle = async (slug: string, id: string) => {
    const rules = rulesBySlug[slug] ?? [];
    const next = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    await saveSubRules(slug, next);
    await load();
  };

  const move = async (slug: string, id: string, dir: "up" | "down") => {
    await moveSubRule(slug, id, dir);
    await load();
  };

  const remove = async (slug: string, id: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Rule?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const rules = rulesBySlug[slug] ?? [];
    await saveSubRules(
      slug,
      rules.filter((r) => r.id !== id),
    );
    await load();
  };

  const upsert = async (slug: string, rule: RoutingRule) => {
    const rules = rulesBySlug[slug] ?? [];
    const exists = rules.some((r) => r.id === rule.id);
    const next = exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule];
    await saveSubRules(slug, next);
    await load();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rules…">
      {subscriptions.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Subscriptions"
          description="Add a subscription in Subscription Manager first"
          icon={Icon.Link}
        />
      )}

      {subscriptions.map((sub) => {
        const slug = slugify(sub.name);
        const rules = rulesBySlug[slug];

        if (rules === null || rules === undefined) {
          return (
            <List.Section key={slug} title={sub.name}>
              <List.Item
                title="Not customized"
                subtitle="Uses rules baked into subscription configs"
                icon={Icon.Lock}
                actions={
                  <ActionPanel>
                    <Action title="Customize Rules" icon={Icon.Pencil} onAction={() => customize(slug)} />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        }

        return (
          <List.Section key={slug} title={sub.name} subtitle={`${rules.length} rule${rules.length === 1 ? "" : "s"}`}>
            {rules.length === 0 && (
              <List.Item
                title="No rules"
                subtitle="All traffic falls through to the default outbound (proxy)"
                icon={Icon.Info}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Add Rule"
                      icon={Icon.Plus}
                      target={<RuleForm subSlug={slug} subName={sub.name} onSave={upsert} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Revert to Defaults"
                      icon={Icon.ArrowCounterClockwise}
                      style={Action.Style.Destructive}
                      onAction={() => revert(slug)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    />
                  </ActionPanel>
                }
              />
            )}
            {rules.map((rule, idx) => (
              <List.Item
                key={rule.id}
                title={rule.value}
                subtitle={`${rule.type} → ${rule.target}${rule.note ? ` — ${rule.note}` : ""}`}
                icon={iconForRule(rule)}
                accessories={[
                  { text: `#${idx + 1}` },
                  ...(rule.enabled ? [] : [{ tag: { value: "Disabled", color: Color.SecondaryText } }]),
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Edit Rule"
                      icon={Icon.Pencil}
                      target={<RuleForm subSlug={slug} subName={sub.name} initial={rule} onSave={upsert} />}
                    />
                    <Action.Push
                      title="Add Rule"
                      icon={Icon.Plus}
                      target={<RuleForm subSlug={slug} subName={sub.name} onSave={upsert} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      onAction={() => move(slug, rule.id, "up")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      onAction={() => move(slug, rule.id, "down")}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    />
                    <Action
                      title={rule.enabled ? "Disable" : "Enable"}
                      icon={rule.enabled ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() => toggle(slug, rule.id)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                    <Action
                      title="Copy Value"
                      icon={Icon.Clipboard}
                      onAction={() => Clipboard.copy(rule.value)}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Delete Rule"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => remove(slug, rule.id)}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    />
                    <Action
                      title="Revert to Defaults"
                      icon={Icon.ArrowCounterClockwise}
                      style={Action.Style.Destructive}
                      onAction={() => revert(slug)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function RuleForm({
  subSlug,
  subName,
  initial,
  onSave,
}: {
  subSlug: string;
  subName: string;
  initial?: RoutingRule;
  onSave: (subSlug: string, rule: RoutingRule) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [type, setType] = useState<RuleType>(initial?.type ?? "domain");
  const [value, setValue] = useState(initial?.value ?? "");
  const [target, setTarget] = useState<RuleTarget>(initial?.target ?? "direct");
  const [note, setNote] = useState(initial?.note ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  const placeholder =
    type === "domain"
      ? "domain:rebrandy or regexp:.*\\.ru$ or geosite:google"
      : type === "ip"
        ? "geoip:private or 192.168.0.0/16"
        : "80,443 or 1024-65535";

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      await showToast(Toast.Style.Failure, "Value is required");
      return;
    }
    const rule: RoutingRule = {
      id: initial?.id ?? crypto.randomUUID(),
      type,
      value: trimmed,
      target,
      enabled,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    await onSave(subSlug, rule);
    await showToast(Toast.Style.Success, initial ? "Rule updated" : "Rule added");
    pop();
  };

  return (
    <Form
      navigationTitle={`${initial ? "Edit" : "Add"} Rule — ${subName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initial ? "Save" : "Add"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" value={type} onChange={(v) => setType(v as RuleType)}>
        <Form.Dropdown.Item value="domain" title="Domain" />
        <Form.Dropdown.Item value="ip" title="IP" />
        <Form.Dropdown.Item value="port" title="Port" />
      </Form.Dropdown>
      <Form.TextField id="value" title="Value" placeholder={placeholder} value={value} onChange={setValue} />
      <Form.Dropdown id="target" title="Target" value={target} onChange={(v) => setTarget(v as RuleTarget)}>
        <Form.Dropdown.Item value="direct" title="Direct (bypass proxy)" />
        <Form.Dropdown.Item value="proxy" title="Proxy (through tunnel)" />
        <Form.Dropdown.Item value="block" title="Block" />
      </Form.Dropdown>
      <Form.TextField id="note" title="Note" placeholder="Optional" value={note} onChange={setNote} />
      <Form.Checkbox id="enabled" label="Enabled" value={enabled} onChange={setEnabled} />
    </Form>
  );
}
