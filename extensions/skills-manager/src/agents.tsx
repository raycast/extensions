import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, Keyboard } from "@raycast/api";
import { useState } from "react";
import { CliGuard } from "./components/CliGuard";
import { AgentSkillsView } from "./components/AgentSkillsView";
import { disableAgent, enableAgent } from "./lib/api";
import { useAgents, usePresets, useSkills } from "./hooks/useLibrary";
import { useCliAction } from "./hooks/useCliAction";
import { pluralize, tildePath } from "./lib/presentation";
import { Agent } from "./lib/types";

export default function Command() {
  return <CliGuard>{() => <Agents />}</CliGuard>;
}

const SHOW_ALL = "all";
const SHOW_INSTALLED = "installed";

function Agents() {
  // Skills Manager knows 50+ agents and most are not on this machine, so the
  // detected ones are the default view.
  const [scope, setScope] = useState(SHOW_INSTALLED);
  const agents = useAgents();
  const skills = useSkills();
  const presets = usePresets();
  const runAction = useCliAction();
  const activePreset = (presets.data ?? []).find((preset) => preset.active);

  function refresh() {
    agents.revalidate();
    skills.revalidate();
    presets.revalidate();
  }

  const deployedCount = new Map<string, number>();
  for (const skill of skills.data ?? []) {
    for (const key of skill.deployed_to) deployedCount.set(key, (deployedCount.get(key) ?? 0) + 1);
  }

  const visible = (agents.data ?? []).filter((agent) => scope === SHOW_ALL || agent.installed);
  const enabled = visible.filter((agent) => agent.enabled);
  const disabled = visible.filter((agent) => !agent.enabled);

  /**
   * Enabling is not just a flag. When a legacy active preset exists the CLI
   * immediately syncs it into the agent's directory, so files appear without
   * anyone asking for a deploy. Say so first, and report what happened after —
   * the CLI's reply carries no list of what it wrote.
   */
  async function enable(agent: Agent) {
    if (activePreset) {
      const confirmed = await confirmAlert({
        title: `Enable ${agent.display_name}?`,
        message: `“${activePreset.name}” is your active preset, so enabling this agent immediately writes its ${pluralize(
          activePreset.skill_count,
          "skill",
        )} into ${tildePath(agent.skills_dir)}. Undeploy them afterwards if that is not what you want.`,
        icon: { source: Icon.Plug, tintColor: Color.Green },
        primaryAction: { title: "Enable Agent" },
      });
      if (!confirmed) return;
    }

    await runAction({
      pending: `Enabling ${agent.display_name}…`,
      run: () => enableAgent(agent.key),
      success: () => ({
        title: `Enabled ${agent.display_name}`,
        message: activePreset ? `“${activePreset.name}” was synced into it.` : "Deploy skills or a preset to fill it.",
      }),
      failureTitle: `Could not enable ${agent.display_name}`,
      onSuccess: refresh,
    });
  }

  /**
   * Disabling is not a visibility toggle: it removes every managed deployment
   * for the agent. The alert says so and points at the narrower commands, since
   * "stop this one skill going to Cursor" is the more common intent.
   */
  async function confirmDisable(agent: Agent) {
    const count = deployedCount.get(agent.key) ?? 0;
    const confirmed = await confirmAlert({
      title: `Disable ${agent.display_name}?`,
      message:
        count > 0
          ? `This removes all ${pluralize(count, "managed skill")} from ${tildePath(
              agent.skills_dir,
            )}. To remove just one skill or preset instead, use Undeploy in My Skills or Presets.`
          : `${agent.display_name} will stop receiving skills. Nothing is deployed to it right now, so no files change.`,
      icon: { source: Icon.Eject, tintColor: Color.Red },
      primaryAction: { title: "Disable Agent", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await runAction({
      pending: `Disabling ${agent.display_name}…`,
      run: () => disableAgent(agent.key),
      success: () => ({
        title: `Disabled ${agent.display_name}`,
        message: count > 0 ? `${pluralize(count, "skill")} removed from it.` : undefined,
      }),
      failureTitle: `Could not disable ${agent.display_name}`,
      onSuccess: refresh,
    });
  }

  function itemFor(agent: Agent) {
    const count = deployedCount.get(agent.key) ?? 0;
    const accessories: List.Item.Accessory[] = [];
    if (count > 0) {
      accessories.push({ icon: Icon.Box, text: String(count), tooltip: `${pluralize(count, "skill")} deployed here` });
    }
    if (!agent.installed) {
      accessories.push({ tag: { value: "Not detected", color: Color.SecondaryText } });
    }
    if (agent.is_custom) {
      accessories.push({ tag: { value: "Custom", color: Color.Blue } });
    }

    return (
      <List.Item
        key={agent.key}
        icon={{
          source: agent.enabled ? Icon.CheckCircle : Icon.Circle,
          tintColor: agent.enabled ? Color.Green : Color.SecondaryText,
        }}
        title={agent.display_name}
        subtitle={tildePath(agent.skills_dir)}
        keywords={[agent.key, agent.category]}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {count > 0 && (
                <Action.Push
                  title="Show Deployed Skills"
                  icon={Icon.Box}
                  target={<AgentSkillsView agent={agent} onChanged={refresh} />}
                />
              )}
              {agent.enabled ? (
                <Action
                  title="Disable Agent"
                  icon={Icon.Eject}
                  style={Action.Style.Destructive}
                  onAction={() => confirmDisable(agent)}
                />
              ) : (
                <Action title="Enable Agent" icon={Icon.Plug} onAction={() => enable(agent)} />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.ShowInFinder title="Reveal Skills Folder" path={agent.skills_dir} />
              <Action.CopyToClipboard
                title="Copy Skills Folder Path"
                content={agent.skills_dir}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard title="Copy Agent Key" content={agent.key} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={agents.isLoading}
      searchBarPlaceholder="Search agents"
      searchBarAccessory={
        <List.Dropdown tooltip="Which agents to show" value={scope} onChange={setScope} storeValue>
          <List.Dropdown.Item title="Detected on This Mac" value={SHOW_INSTALLED} icon={Icon.Desktop} />
          <List.Dropdown.Item title="All Known Agents" value={SHOW_ALL} icon={Icon.List} />
        </List.Dropdown>
      }
    >
      <List.Section title="Enabled" subtitle={`${enabled.length} receiving skills`}>
        {enabled.map(itemFor)}
      </List.Section>
      <List.Section title="Disabled" subtitle={String(disabled.length)}>
        {disabled.map(itemFor)}
      </List.Section>
      <List.EmptyView icon={Icon.Terminal} title="No agents found" />
    </List>
  );
}
