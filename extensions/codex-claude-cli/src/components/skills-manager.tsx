import { Action, ActionPanel, Alert, Color, Detail, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { homedir } from "node:os";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClaudeSettingsScope,
  ManagedSkill,
  SkillInventory,
  SkillInventoryWarning,
  SkillProvider,
  SkillScope,
  claudeSkillSettingsPath,
  loadSkillInventory,
  readSkillMarkdown,
  setClaudeSkillEnabled,
  setCodexSkillEnabled,
} from "../lib/skills";
import { providerIcon } from "../lib/presentation";
import { shortcut, useShortcutStore } from "../lib/shortcuts";

type SkillFilter = "all" | `provider:${SkillProvider}` | "status:enabled" | "status:disabled" | `scope:${SkillScope}`;

interface SkillsManagerProps {
  workingDirectory?: string;
  initialProvider?: SkillProvider;
}

const emptyInventory: SkillInventory = { skills: [], warnings: [], codexSource: "app-server" };
const skillScopes: SkillScope[] = ["project", "user", "plugin", "system", "admin"];

export function SkillsManager({ workingDirectory = homedir(), initialProvider }: SkillsManagerProps) {
  useShortcutStore();
  const initialFilter: SkillFilter = initialProvider ? `provider:${initialProvider}` : "all";
  const [inventory, setInventory] = useState<SkillInventory>(emptyInventory);
  const [filter, setFilter] = useState<SkillFilter>(initialFilter);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const reload = useCallback(
    async (announce = false) => {
      setIsLoading(true);
      setLoadError(undefined);
      try {
        const nextInventory = await loadSkillInventory(workingDirectory);
        setInventory(nextInventory);
        if (announce) {
          await showToast({
            style: nextInventory.warnings.length ? Toast.Style.Failure : Toast.Style.Success,
            title: nextInventory.warnings.length ? "Skills Partially Updated" : "Skills Updated",
            message: `${nextInventory.skills.length} ${"available"}`,
          });
        }
      } catch (error) {
        const message = errorMessage(error, "Could not load the skills inventory.");
        setLoadError(message);
        if (announce)
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Refresh",
            message,
          });
      } finally {
        setIsLoading(false);
      }
    },
    [workingDirectory],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredSkills = useMemo(
    () => inventory.skills.filter((skill) => matchesFilter(skill, filter)),
    [filter, inventory.skills],
  );
  const codexSkills = filteredSkills.filter((skill) => skill.provider === "codex");
  const claudeSkills = filteredSkills.filter((skill) => skill.provider === "claude");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={"Search skills, descriptions, scopes, or invocations…"}
      searchBarAccessory={
        <List.Dropdown tooltip={"Filter skills"} value={filter} onChange={(value) => setFilter(value as SkillFilter)}>
          <List.Dropdown.Item title={`${"All"} (${inventory.skills.length})`} value="all" icon={Icon.List} />
          <List.Dropdown.Section title={"Provider"}>
            <List.Dropdown.Item
              title={`Codex (${countSkills(inventory.skills, "provider:codex")})`}
              value="provider:codex"
              icon={providerIcon("codex")}
            />
            <List.Dropdown.Item
              title={`Claude (${countSkills(inventory.skills, "provider:claude")})`}
              value="provider:claude"
              icon={providerIcon("claude")}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={"Status"}>
            <List.Dropdown.Item
              title={`${"Enabled"} (${countSkills(inventory.skills, "status:enabled")})`}
              value="status:enabled"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
            <List.Dropdown.Item
              title={`${"Disabled"} (${countSkills(inventory.skills, "status:disabled")})`}
              value="status:disabled"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={"Scope"}>
            {skillScopes.map((scope) => (
              <List.Dropdown.Item
                key={scope}
                title={`${scopeTitle(scope)} (${countSkills(inventory.skills, `scope:${scope}`)})`}
                value={`scope:${scope}`}
                icon={scopeIcon(scope)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredSkills.length === 0 && inventory.warnings.length === 0 ? (
        <List.EmptyView
          icon={loadError ? Icon.ExclamationMark : Icon.Stars}
          title={loadError ? "Could Not Load Skills" : "No Skills Match This Filter"}
          description={loadError || "Change the filter or add a SKILL.md to Claude or Codex."}
          actions={
            <ActionPanel>
              <Action
                title={"Refresh Skills"}
                icon={Icon.ArrowClockwise}
                shortcut={shortcut("common.refresh")}
                onAction={() => reload(true)}
              />
            </ActionPanel>
          }
        />
      ) : null}

      <SkillSection title="Codex" skills={codexSkills} workingDirectory={workingDirectory} onRefresh={reload} />
      <SkillSection title="Claude" skills={claudeSkills} workingDirectory={workingDirectory} onRefresh={reload} />
      {inventory.warnings.length ? (
        <List.Section title={"Inventory Warnings"} subtitle={`${inventory.warnings.length}`}>
          {inventory.warnings.map((warning, index) => (
            <SkillWarningItem
              key={`${warning.provider}:${warning.path || warning.message}:${index}`}
              warning={warning}
              onRefresh={() => reload(true)}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function SkillSection({
  title,
  skills,
  workingDirectory,
  onRefresh,
}: {
  title: string;
  skills: ManagedSkill[];
  workingDirectory: string;
  onRefresh: (announce?: boolean) => Promise<void>;
}) {
  if (!skills.length) return null;
  return (
    <List.Section title={title} subtitle={`${skills.length}`}>
      {skills.map((skill) => (
        <SkillItem key={skill.id} skill={skill} workingDirectory={workingDirectory} onRefresh={onRefresh} />
      ))}
    </List.Section>
  );
}

function SkillItem({
  skill,
  workingDirectory,
  onRefresh,
}: {
  skill: ManagedSkill;
  workingDirectory: string;
  onRefresh: (announce?: boolean) => Promise<void>;
}) {
  return (
    <List.Item
      id={skill.id}
      icon={providerIcon(skill.provider)}
      title={skill.name}
      subtitle={skill.description}
      keywords={[skill.invocation, skill.origin, skill.path, providerTitle(skill.provider), scopeTitle(skill.scope)]}
      accessories={skillAccessories(skill)}
      detail={<SkillSummary skill={skill} />}
      actions={
        <SkillActions skill={skill} workingDirectory={workingDirectory} onRefresh={onRefresh} includeMarkdownAction />
      }
    />
  );
}

function SkillSummary({ skill }: { skill: ManagedSkill }) {
  return (
    <List.Item.Detail
      markdown={[
        `## ${escapeMarkdown(skill.name)}`,
        "",
        escapeMarkdown(skill.description),
        "",
        skill.statusReason ? `> ${escapeMarkdown(skill.statusReason)}` : "",
        "",
        `${"Invoke with"} \`${escapeInlineCode(skill.invocation)}\`.`,
      ]
        .filter(Boolean)
        .join("\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={"Provider"} text={providerTitle(skill.provider)} />
          <List.Item.Detail.Metadata.Label
            title={"Status"}
            text={{
              value: skill.enabled ? "Enabled" : "Disabled",
              color: skill.enabled ? Color.Green : Color.Red,
            }}
          />
          <List.Item.Detail.Metadata.Label title={"Scope"} text={scopeTitle(skill.scope)} />
          <List.Item.Detail.Metadata.Label title={"Origin"} text={skill.origin} />
          {skill.pluginId ? <List.Item.Detail.Metadata.Label title="Plugin" text={skill.pluginId} /> : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={"Invocation"} text={skill.invocation} />
          <List.Item.Detail.Metadata.Label title={"File"} text={skill.path} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function SkillActions({
  skill,
  workingDirectory,
  onRefresh,
  includeMarkdownAction,
}: {
  skill: ManagedSkill;
  workingDirectory: string;
  onRefresh: (announce?: boolean) => Promise<void>;
  includeMarkdownAction: boolean;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Skill">
        {includeMarkdownAction ? (
          <Action.Push
            title={"View Full SKILL.md"}
            icon={Icon.Document}
            target={<SkillMarkdownView skill={skill} workingDirectory={workingDirectory} onRefresh={onRefresh} />}
          />
        ) : null}
        <Action.Open title={"Open SKILL.md"} icon={Icon.Document} target={skill.path} />
        <Action.ShowInFinder title={"Show Folder in Finder"} icon={Icon.Finder} path={skill.directory} />
      </ActionPanel.Section>
      <ActionPanel.Section title={"Copy"}>
        <Action.CopyToClipboard title={"Copy Invocation"} icon={Icon.Terminal} content={skill.invocation} />
        <Action.CopyToClipboard title={"Copy Path"} icon={Icon.CopyClipboard} content={skill.path} />
      </ActionPanel.Section>
      {skill.canToggle ? (
        <ActionPanel.Section title={"Status"}>
          {skill.provider === "codex" ? (
            <Action
              title={skill.enabled ? "Disable in Codex" : "Enable in Codex"}
              icon={skill.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
              style={skill.enabled ? Action.Style.Destructive : Action.Style.Regular}
              onAction={() => changeSkillState(skill, !skill.enabled, workingDirectory, onRefresh)}
            />
          ) : (
            <>
              <Action
                title={skill.enabled ? "Disable for User" : "Enable for User"}
                icon={skill.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                style={skill.enabled ? Action.Style.Destructive : Action.Style.Regular}
                onAction={() => changeSkillState(skill, !skill.enabled, workingDirectory, onRefresh, "user")}
              />
              <Action
                title={skill.enabled ? "Disable in This Project" : "Enable in This Project"}
                icon={skill.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                style={skill.enabled ? Action.Style.Destructive : Action.Style.Regular}
                onAction={() => changeSkillState(skill, !skill.enabled, workingDirectory, onRefresh, "project")}
              />
            </>
          )}
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section title={"Inventory"}>
        <Action
          title={"Refresh Skills"}
          icon={Icon.ArrowClockwise}
          shortcut={shortcut("common.refresh")}
          onAction={() => onRefresh(true)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function SkillMarkdownView({
  skill,
  workingDirectory,
  onRefresh,
}: {
  skill: ManagedSkill;
  workingDirectory: string;
  onRefresh: (announce?: boolean) => Promise<void>;
}) {
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void readSkillMarkdown(skill.path)
      .then((content) => {
        if (!cancelled) setMarkdown(content);
      })
      .catch((error) => {
        if (!cancelled) {
          setMarkdown(`## ${"Could Not Read SKILL.md"}\n\n${escapeMarkdown(errorMessage(error, "Unknown error."))}`);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skill.path]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${providerTitle(skill.provider)} · ${skill.name}`}
      markdown={markdown}
      actions={
        <SkillActions
          skill={skill}
          workingDirectory={workingDirectory}
          onRefresh={onRefresh}
          includeMarkdownAction={false}
        />
      }
    />
  );
}

function SkillWarningItem({ warning, onRefresh }: { warning: SkillInventoryWarning; onRefresh: () => Promise<void> }) {
  return (
    <List.Item
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
      title={providerTitle(warning.provider)}
      subtitle={warning.message}
      accessories={[{ tag: { value: "Warning", color: Color.Yellow } }]}
      detail={
        <List.Item.Detail
          markdown={`## ${"Warning From"} ${providerTitle(warning.provider)}\n\n${escapeMarkdown(warning.message)}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={"Provider"} text={providerTitle(warning.provider)} />
              {warning.path ? <List.Item.Detail.Metadata.Label title={"Path"} text={warning.path} /> : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={"Refresh Skills"}
            icon={Icon.ArrowClockwise}
            shortcut={shortcut("common.refresh")}
            onAction={onRefresh}
          />
          {warning.path ? (
            <Action.CopyToClipboard title={"Copy Path"} icon={Icon.CopyClipboard} content={warning.path} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

async function changeSkillState(
  skill: ManagedSkill,
  enabled: boolean,
  workingDirectory: string,
  onRefresh: (announce?: boolean) => Promise<void>,
  claudeSettingsScope: ClaudeSettingsScope = "user",
) {
  const provider = providerTitle(skill.provider);
  const destination =
    skill.provider === "codex"
      ? "the official Codex configuration"
      : `skillOverrides en ${await claudeSkillSettingsPath(workingDirectory, claudeSettingsScope)}`;
  const confirmed = await confirmAlert({
    title: `${enabled ? "Enable" : "Disable"} ${skill.name}`,
    message: `${enabled ? "It will be enabled" : "It will be disabled"} ${"through"} ${destination}. ${"No skill files will be deleted."}`,
    primaryAction: {
      title: enabled ? "Enable Skill" : "Disable Skill",
      style: enabled ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: enabled ? "Enabling Skill…" : "Disabling Skill…",
    message: `${provider} · ${skill.name}`,
  });
  try {
    if (skill.provider === "codex") {
      const effectiveEnabled = await setCodexSkillEnabled(skill, enabled);
      if (effectiveEnabled !== enabled) {
        throw new Error("Codex saved the preference, but a higher-level policy prevents the requested state.");
      }
    } else {
      await setClaudeSkillEnabled(skill, enabled, workingDirectory, claudeSettingsScope);
    }
    await onRefresh();
    toast.style = Toast.Style.Success;
    toast.title = enabled ? "Skill Enabled" : "Skill Disabled";
    toast.message =
      skill.provider === "claude"
        ? `${"Preference saved in"} ${scopeTitleForSettings(claudeSettingsScope)}`
        : skill.name;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Change The Skill";
    toast.message = errorMessage(error, "The CLI rejected the change.");
  }
}

function matchesFilter(skill: ManagedSkill, filter: SkillFilter): boolean {
  if (filter === "all") return true;
  if (filter === "status:enabled") return skill.enabled;
  if (filter === "status:disabled") return !skill.enabled;
  const [kind, value] = filter.split(":") as ["provider" | "scope", string];
  return kind === "provider" ? skill.provider === value : skill.scope === value;
}

function countSkills(skills: ManagedSkill[], filter: SkillFilter): number {
  return skills.filter((skill) => matchesFilter(skill, filter)).length;
}

function skillAccessories(skill: ManagedSkill): List.Item.Accessory[] {
  return [
    { tag: { value: scopeTitle(skill.scope), color: scopeColor(skill.scope) }, icon: scopeIcon(skill.scope) },
    {
      tag: {
        value: skill.enabled ? "Enabled" : "Disabled",
        color: skill.enabled ? Color.Green : Color.Red,
      },
      icon: skill.enabled ? Icon.CheckCircle : Icon.XMarkCircle,
      tooltip: skill.statusReason || (skill.enabled ? "Skill available" : "Skill disabled"),
    },
  ];
}

function providerTitle(provider: SkillProvider): string {
  return provider === "claude" ? "Claude" : "Codex";
}

function scopeTitle(scope: SkillScope): string {
  return {
    project: "Project",
    user: "User",
    plugin: "Plugin",
    system: "System",
    admin: "Managed",
  }[scope];
}

function scopeIcon(scope: SkillScope): Icon {
  return {
    project: Icon.Folder,
    user: Icon.PersonCircle,
    plugin: Icon.Plug,
    system: Icon.Gear,
    admin: Icon.Lock,
  }[scope];
}

function scopeColor(scope: SkillScope): Color {
  return {
    project: Color.Yellow,
    user: Color.Blue,
    plugin: Color.Purple,
    system: Color.SecondaryText,
    admin: Color.Red,
  }[scope];
}

function scopeTitleForSettings(scope: ClaudeSettingsScope): string {
  return scope === "user" ? "User" : "This project";
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()<>#+\-.!|]/gu, "\\$&");
}

function escapeInlineCode(value: string): string {
  return value.replace(/`/g, "\\`");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
