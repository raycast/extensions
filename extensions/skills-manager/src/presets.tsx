import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CliGuard } from "./components/CliGuard";
import { PresetForm } from "./components/PresetForm";
import { PresetSkillsView } from "./components/PresetSkillsView";
import { deletePreset, deployPreset, listSkills, presetStatus, undeployPreset } from "./lib/api";
import { useAgents, usePresets, useTags } from "./hooks/useLibrary";
import { useCliAction } from "./hooks/useCliAction";
import { codingTargets, deployTargets, pluralize } from "./lib/presentation";
import { isNotFound } from "./lib/errors";
import { Preset, PresetStatus } from "./lib/types";

export default function Command() {
  return <CliGuard>{() => <Presets />}</CliGuard>;
}

function Presets() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const presets = usePresets();
  const agents = useAgents();
  const tags = useTags();
  const runAction = useCliAction();

  const { ready } = deployTargets(agents.data ?? []);
  // The no-agent deploy below hits only these; naming an agent explicitly can
  // still reach the wider `ready` set.
  const defaultTargets = codingTargets(agents.data ?? []);

  // Only the highlighted preset is inspected: `presets status` and the member
  // list are two more processes each, and a library can hold many presets.
  const detail = useCachedPromise(
    async (id: string | null) => {
      if (!id) return null;
      const [status, skills] = await Promise.all([presetStatus(id), listSkills({ preset: id })]);
      return { status, skills };
    },
    [selectedId],
    {
      keepPreviousData: false,
      // Supplying onError replaces the library's default failure toast outright,
      // so it must not swallow everything: only a selection that has gone stale
      // (deleted here or in the desktop app) is expected and silent. A lock
      // conflict or a timeout still has to be reported, or a populated preset
      // renders as an empty one with no explanation.
      onError: (error) => {
        if (isNotFound(error)) return;
        showFailureToast(error, { title: "Could not load preset details" });
      },
    },
  );

  function refresh() {
    presets.revalidate();
    agents.revalidate();
    detail.revalidate();
  }

  async function deploy(preset: Preset, agentKey?: string) {
    const where = agentKey
      ? (agents.data?.find((agent) => agent.key === agentKey)?.display_name ?? agentKey)
      : `all ${pluralize(defaultTargets.length, "enabled coding agent")}`;
    await runAction({
      pending: `Deploying ${preset.name}…`,
      run: () => deployPreset(preset.id, agentKey ? [agentKey] : []),
      success: (result) => {
        const changed = result?.changed_pairs ?? 0;
        return {
          title: `Deployed ${preset.name} to ${where}`,
          // A zero here means every target was already in place, not that
          // something went wrong — say which it is.
          message: changed > 0 ? `${pluralize(changed, "deployment")} added.` : "Everything was already in place.",
        };
      },
      failureTitle: `Could not deploy ${preset.name}`,
      onSuccess: refresh,
    });
  }

  /**
   * The no-agent form is deliberately broader than deploy's: the CLI finds the
   * preset's real target rows and removes them even where the agent has since
   * been disabled or unregistered. That is the "turn this off everywhere" case.
   */
  async function undeploy(preset: Preset, agentKey?: string) {
    const where = agentKey
      ? (agents.data?.find((agent) => agent.key === agentKey)?.display_name ?? agentKey)
      : "every agent that has it";
    await runAction({
      pending: `Undeploying ${preset.name}…`,
      run: () => undeployPreset(preset.id, agentKey ? [agentKey] : []),
      success: (result) => {
        const changed = result?.changed_pairs ?? 0;
        return changed > 0
          ? {
              title: `Removed ${preset.name} from ${where}`,
              message: `${pluralize(changed, "deployment")} removed. Its skills stay in your library.`,
            }
          : { title: `${preset.name} was not deployed there`, message: "Nothing to remove." };
      },
      failureTitle: `Could not undeploy ${preset.name}`,
      onSuccess: refresh,
    });
  }

  async function confirmDelete(preset: Preset) {
    const confirmed = await confirmAlert({
      title: `Delete preset “${preset.name}”?`,
      message: `The preset and its membership list are deleted. The ${pluralize(
        preset.skill_count,
        "skill",
      )} inside stay in your library, and any copies already deployed to agents stay where they are.`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete Preset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await runAction({
      pending: `Deleting ${preset.name}…`,
      run: () => deletePreset(preset.id),
      success: () => ({ title: `Deleted ${preset.name}` }),
      failureTitle: `Could not delete ${preset.name}`,
      // Drop the selection first. The detail hook revalidates with its latest
      // args, and asking the CLI for a preset that no longer exists fails —
      // which would replace the success toast with a bogus "not found" error.
      onSuccess: () => {
        setSelectedId(null);
        presets.revalidate();
        agents.revalidate();
      },
    });
  }

  return (
    <List
      isLoading={presets.isLoading}
      isShowingDetail={(presets.data ?? []).length > 0}
      searchBarPlaceholder="Search presets"
      onSelectionChange={setSelectedId}
    >
      <List.EmptyView
        icon={Icon.Layers}
        title="No presets yet"
        description="A preset is a reusable group of skills you can deploy to agents in one step."
        actions={
          <ActionPanel>
            <Action.Push title="Create Preset" icon={Icon.Plus} target={<PresetForm onDone={refresh} />} />
          </ActionPanel>
        }
      />
      {(presets.data ?? []).map((preset) => (
        <List.Item
          key={preset.id}
          id={preset.id}
          icon={Icon.Layers}
          title={preset.name}
          accessories={[{ text: pluralize(preset.skill_count, "skill"), icon: Icon.Box }]}
          detail={
            <List.Item.Detail
              isLoading={detail.isLoading && selectedId === preset.id}
              markdown={detailMarkdown(preset, selectedId === preset.id ? (detail.data?.skills ?? []) : [])}
              metadata={
                selectedId === preset.id && detail.data ? <PresetMetadata status={detail.data.status} /> : undefined
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Deploy">
                <Action
                  title="Deploy to All Enabled Coding Agents"
                  icon={Icon.Upload}
                  onAction={() => deploy(preset)}
                />
                {ready.length > 0 && (
                  <ActionPanel.Submenu title="Deploy to Agent" icon={Icon.Upload}>
                    {ready.map((agent) => (
                      <Action
                        key={agent.key}
                        title={agent.display_name}
                        icon={Icon.Terminal}
                        onAction={() => deploy(preset, agent.key)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
                <Action
                  title="Undeploy Everywhere"
                  icon={Icon.Eject}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => undeploy(preset)}
                />
                {ready.length > 0 && (
                  <ActionPanel.Submenu title="Undeploy from Agent" icon={Icon.Eject}>
                    {ready.map((agent) => (
                      <Action
                        key={agent.key}
                        title={agent.display_name}
                        icon={Icon.Terminal}
                        onAction={() => undeploy(preset, agent.key)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
              </ActionPanel.Section>

              <ActionPanel.Section title="Preset">
                <Action.Push
                  title="Show Skills in Preset"
                  icon={Icon.Box}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  target={<PresetSkillsView preset={preset} knownTags={tags.data ?? []} onChanged={refresh} />}
                />
                <Action.Push
                  title="Create Preset"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<PresetForm onDone={refresh} />}
                />
                <Action.Push
                  title="Rename Preset"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<PresetForm preset={preset} onDone={refresh} />}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => confirmDelete(preset)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function detailMarkdown(preset: Preset, skills: { name: string }[]): string {
  const heading = `# ${preset.name}`;
  const description = preset.description ? `\n\n${preset.description}` : "";
  const members = skills.length
    ? `\n\n## Skills\n\n${skills.map((skill) => `- ${skill.name}`).join("\n")}`
    : "\n\n_This preset has no skills yet._";
  return `${heading}${description}${members}`;
}

function PresetMetadata({ status }: { status: PresetStatus }) {
  const active = status.agents.filter((agent) => agent.deployed > 0);

  return (
    <List.Item.Detail.Metadata>
      {active.length > 0 ? (
        active.map((agent) => (
          <List.Item.Detail.Metadata.Label
            key={agent.key}
            title={agent.display_name}
            text={`${agent.deployed} of ${agent.total} deployed`}
            icon={{
              source: agent.deployed === agent.total ? Icon.CheckCircle : Icon.CircleProgress50,
              tintColor: agent.deployed === agent.total ? Color.Green : Color.Orange,
            }}
          />
        ))
      ) : (
        <List.Item.Detail.Metadata.Label
          title="Deployment"
          text="Not deployed to any agent"
          icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
        />
      )}
    </List.Item.Detail.Metadata>
  );
}
