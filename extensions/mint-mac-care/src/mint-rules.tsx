import { Action, ActionPanel, Form, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { formatCompact, openMint, plural, runMintSurface, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { NeedsNewerMint, RetryActions, chosenAccessory, runConfirmedInMint, useChosen } from "./confirm-in-mint";
import { usePlanWall } from "./plan-wall";
import {
  NATIVE_APPROVAL_CAPABILITY,
  customRule,
  hasCapability,
  ruleActionTitle,
  ruleRows,
  ruleSummary,
  runParity,
} from "./mint-parity";
import type { Rule, RuleAction, RuleDraft, RuleScan, RulesAnswer } from "./mint-parity";
import { useMintCLI } from "./use-mint-cli";

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  if (!hasCapability(resolution.version, NATIVE_APPROVAL_CAPABILITY)) return <NeedsNewerMint command="Cleanup Rules" />;
  return <Rules cli={resolution.path} />;
}

/**
 * Mint's cleanup rules, built-in and the person's own: what each matches and
 * what it does. Preview runs one rule over the organized folders; turning a
 * rule on or off, saving or removing one is confirmed in Mint's own window.
 */
function Rules({ cli }: { cli: string }) {
  // The plan wall (2026-11-10): custom rules are a plan feature.
  const wall = usePlanWall(cli);
  const { data, error, isLoading, revalidate } = usePromise(
    async (path: string) => runParity<RulesAnswer>(path, { action: "rules.list" }, 60_000),
    [cli],
  );
  const rows = ruleRows(data);

  async function change(action: "rules.enable" | "rules.disable" | "rules.remove", rule: Rule) {
    const words = { "rules.enable": "turned on", "rules.disable": "turned off", "rules.remove": "removed" }[action];
    await runConfirmedInMint(
      cli,
      { action, ruleID: rule.id },
      { done: () => `${rule.name} ${words}`, failed: "Mint could not change the rule", gate: "rules" },
      action === "rules.enable" ? wall : undefined,
    );
    revalidate();
  }

  const create = (
    <Action.Push
      title="New Rule…"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<RuleForm cli={cli} onSaved={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rules">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mint could not read its rules"
          description={error.message}
          actions={<RetryActions onRetry={revalidate} />}
        />
      ) : null}
      {(["builtin", "custom"] as const).map((group) => (
        <List.Section key={group} title={group === "builtin" ? "Built in" : "Made by hand"}>
          {rows
            .filter((rule) => rule.builtin === (group === "builtin"))
            .map((rule) => (
              <List.Item
                key={rule.id}
                icon={rule.enabled ? Icon.CheckCircle : Icon.Circle}
                title={rule.name}
                subtitle={rule.subtitle || ruleSummary(rule.filter)}
                accessories={[{ tag: ruleActionTitle(rule.preferredAction) }, { text: rule.enabled ? "On" : "Off" }]}
                actions={
                  <ActionPanel>
                    <Action.Push title="Preview" icon={Icon.Eye} target={<RulePreview cli={cli} rule={rule} />} />
                    {/* Read-only in the ⌘↵ slot: a rule changes only from the actions below. */}
                    <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
                    {rule.enabled ? (
                      <Action
                        title="Turn off Rule…"
                        icon={Icon.Circle}
                        onAction={() => change("rules.disable", rule)}
                      />
                    ) : (
                      <Action
                        title="Turn on Rule…"
                        icon={Icon.CheckCircle}
                        onAction={() => change("rules.enable", rule)}
                      />
                    )}
                    {!rule.builtin ? (
                      <>
                        <Action.Push
                          title="Edit…"
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={<RuleForm cli={cli} rule={rule} onSaved={revalidate} />}
                        />
                        <Action
                          title="Remove…"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => change("rules.remove", rule)}
                        />
                      </>
                    ) : null}
                    {create}
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

const ACTIONS: RuleAction[] = ["trash", "review", "protected", "delete"];

function RuleForm({ cli, rule, onSaved }: { cli: string; rule?: Rule; onSaved: () => void }) {
  const { pop } = useNavigation();
  const wall = usePlanWall(cli);
  const filter = rule?.filter ?? {};
  return (
    <Form
      navigationTitle={rule ? `Edit ${rule.name}` : "New Rule"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save…"
            icon={Icon.Check}
            onSubmit={async (draft: RuleDraft) => {
              const made = customRule(draft, rule?.id ?? `custom-${randomUUID().toLowerCase()}`, rule);
              if (!made.rule) {
                await showToast({ style: Toast.Style.Failure, title: made.problem ?? "Check the rule" });
                return;
              }
              const saved = await runConfirmedInMint(
                cli,
                { action: rule ? "rules.update" : "rules.add", rule: { ...made.rule, enabled: rule?.enabled ?? true } },
                { done: () => `${made.rule!.name} saved`, failed: "Mint could not save the rule", gate: "rules" },
                wall,
              );
              if (saved) {
                onSaved();
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={rule?.name ?? ""} placeholder="Old installers" />
      <Form.Description text="A file matches when it fits everything filled in below." />
      <Form.TextField
        id="extensions"
        title="File types"
        defaultValue={filter.extensions?.join(", ") ?? ""}
        placeholder="dmg, pkg, zip"
      />
      <Form.TextField
        id="nameKeyword"
        title="Name contains"
        defaultValue={filter.nameKeyword ?? ""}
        placeholder="installer"
      />
      <Form.TextField
        id="olderThanDays"
        title="Older than (days)"
        defaultValue={filter.olderThanDays ? String(filter.olderThanDays) : ""}
        placeholder="30"
      />
      <Form.TextField
        id="minSizeMB"
        title="At least (MB)"
        defaultValue={filter.minSizeMB ? String(filter.minSizeMB) : ""}
        placeholder="100"
      />
      <Form.Dropdown id="action" title="Then" defaultValue={rule?.preferredAction ?? "trash"}>
        {ACTIONS.map((action) => (
          <Form.Dropdown.Item key={action} value={action} title={ruleActionTitle(action)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

type DiskClean = { movedToTrashBytes?: number; failedCount?: number; failures?: Array<{ reason: string }> };

/** What one rule finds in the organized folders now; the chosen files can go to the Trash. */
function RulePreview({ cli, rule }: { cli: string; rule: Rule }) {
  const { data, error, isLoading, revalidate } = usePromise(
    async (path: string) => runParity<RuleScan>(path, { action: "rules.scan", ruleID: rule.id }, 10 * 60_000),
    [cli],
  );
  const { chosen, toggle, clear } = useChosen();
  const rows = [...(data?.items ?? [])].sort((a, b) => b.sizeBytes - a.sizeBytes);
  const picked = rows.filter((row) => chosen.has(row.id));

  async function trash() {
    if (!data || picked.length === 0) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Moving to the Trash…" });
    try {
      const result = await runMintSurface<DiskClean>(cli, {
        action: "disk.clean",
        sessionID: data.sessionID,
        itemIDs: picked.map((row) => row.id),
        confirmed: true,
        permanent: false,
      });
      toast.style = result.failedCount ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `${formatCompact(result.movedToTrashBytes ?? 0)} moved to the Trash`;
      toast.message = result.failedCount
        ? `${result.failedCount} kept: ${result.failures?.[0]?.reason ?? ""}`
        : undefined;
    } catch (cleanError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not move them";
      toast.message = cleanError instanceof Error ? cleanError.message : String(cleanError);
    }
    clear();
    revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={rule.name}
      searchBarPlaceholder={data ? `${plural(rows.length, "file")} · ${formatCompact(data.totalBytes)}` : "Looking…"}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mint could not run the rule"
          description={error.message}
          actions={<RetryActions onRetry={revalidate} />}
        />
      ) : null}
      {!error && !isLoading && rows.length === 0 ? (
        <List.EmptyView icon={Icon.CheckCircle} title="Nothing matches now" />
      ) : null}
      {rows.map((row) => {
        const isChosen = chosen.has(row.id);
        return (
          <List.Item
            key={row.id}
            icon={{ fileIcon: row.path }}
            title={row.label}
            subtitle={shortPath(row.path)}
            accessories={[{ text: formatCompact(row.sizeBytes) }, chosenAccessory(isChosen)]}
            actions={
              <ActionPanel>
                <Action
                  title={isChosen ? "Unchoose" : "Choose"}
                  icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(row.id)}
                />
                <Action.ShowInFinder path={row.path} />
                {picked.length ? (
                  <Action
                    title={`Move ${plural(picked.length, "Chosen File")} to the Trash`}
                    icon={Icon.Trash}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={trash}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
