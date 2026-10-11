import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import {
  addSkillsToPreset,
  deploySkills,
  removeSkill,
  removeSkillsFromPreset,
  removeTag,
  undeploySkills,
  updateSkill,
} from "../lib/api";
import { useCliAction } from "../hooks/useCliAction";
import { agentName, deployTargets, pluralize, tildePath } from "../lib/presentation";
import { Agent, Preset, Skill, heldBack } from "../lib/types";
import { HeldBackView } from "./HeldBackView";
import { SkillMarkdownView } from "./SkillMarkdownView";
import { TagForm } from "./TagForm";

interface SkillActionsProps {
  skill: Skill;
  agents: Agent[] | undefined;
  presets: Preset[] | undefined;
  knownTags: string[];
  onRefresh: () => void;
  /** Extra actions rendered above everything else, e.g. the detail toggle. */
  children?: React.ReactNode;
}

export function SkillActions({ skill, agents, presets, knownTags, onRefresh, children }: SkillActionsProps) {
  const runAction = useCliAction();
  const { push } = useNavigation();
  const { ready, disabled } = deployTargets(agents ?? []);

  const notDeployed = ready.filter((agent) => !skill.deployed_to.includes(agent.key));
  const deployedAgents = skill.deployed_to;

  async function deploy(agent: Agent) {
    await runAction({
      pending: `Deploying ${skill.name} to ${agent.display_name}…`,
      run: () => deploySkills([skill.id], [agent.key]),
      success: () => ({
        title: `Deployed to ${agent.display_name}`,
        message: tildePath(`${agent.skills_dir}/${skill.name}`),
      }),
      failureTitle: `Could not deploy to ${agent.display_name}`,
      onSuccess: onRefresh,
    });
  }

  async function undeploy(key: string) {
    const name = agentName(agents, key);
    await runAction({
      pending: `Removing ${skill.name} from ${name}…`,
      run: () => undeploySkills([skill.id], [key]),
      success: () => ({ title: `Removed from ${name}`, message: "The library copy is untouched." }),
      failureTitle: `Could not undeploy from ${name}`,
      onSuccess: onRefresh,
    });
  }

  async function update() {
    if (skill.source_type === "local") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No upstream to update from",
        message: `${skill.name} is a local skill. Re-point it at a git source to make updates possible.`,
      });
      return;
    }

    const outcome = await runAction({
      pending: `Updating ${skill.name}…`,
      run: () => updateSkill(skill.id),
      success: (data) => {
        if (heldBack(data)) return { title: `${skill.name} was left on its old version` };
        return data?.some((entry) => entry.refreshed)
          ? { title: `Updated ${skill.name}` }
          : { title: `${skill.name} was already up to date` };
      },
      failureTitle: `Could not update ${skill.name}`,
      onSuccess: onRefresh,
    });

    // Not a failure: the CLI withheld the update to protect files the new
    // version does not ship. There is no override flag, so explain it in full.
    if (outcome.ok && heldBack(outcome.value)) {
      push(<HeldBackView results={outcome.value} />);
    }
  }

  async function confirmRemove() {
    const deployedNote =
      deployedAgents.length > 0
        ? ` It is deployed to ${pluralize(deployedAgents.length, "agent")} (${deployedAgents
            .map((key) => agentName(agents, key))
            .join(", ")}); those copies go too.`
        : "";

    const confirmed = await confirmAlert({
      title: `Remove “${skill.name}”?`,
      message: `This deletes the central library copy, every deployed copy across agents, and the database row.${deployedNote} It cannot be undone without reinstalling the skill.`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Remove Skill", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await runAction({
      pending: `Removing ${skill.name}…`,
      run: () => removeSkill(skill.id),
      success: () => ({ title: `Removed ${skill.name}` }),
      failureTitle: `Could not remove ${skill.name}`,
      onSuccess: onRefresh,
    });
  }

  const memberOf = new Set(skill.presets);
  const repoUrl = skill.source_type === "git" && skill.source_ref ? repositoryUrl(skill.source_ref) : null;

  return (
    <ActionPanel>
      {/* Reading the skill is the default action everywhere this panel appears.
          Contextual actions follow it rather than leading, so no bare Return
          ever mutates a deployment — the agent view's "undeploy from here"
          would otherwise sit under the default key. */}
      <ActionPanel.Section>
        <Action.Push
          title="View Skill.md"
          icon={Icon.Document}
          target={<SkillMarkdownView reference={skill.id} title={skill.name} />}
        />
        {children}
      </ActionPanel.Section>

      <ActionPanel.Section title="Deploy">
        {notDeployed.length > 0 && (
          <ActionPanel.Submenu title="Deploy to Agent" icon={Icon.Upload} shortcut={{ modifiers: ["cmd"], key: "d" }}>
            {notDeployed.map((agent) => (
              <Action key={agent.key} title={agent.display_name} icon={Icon.Terminal} onAction={() => deploy(agent)} />
            ))}
          </ActionPanel.Submenu>
        )}
        {deployedAgents.length > 0 && (
          <ActionPanel.Submenu
            title="Undeploy from Agent"
            icon={Icon.Eject}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          >
            {deployedAgents.map((key) => (
              <Action key={key} title={agentName(agents, key)} icon={Icon.Terminal} onAction={() => undeploy(key)} />
            ))}
          </ActionPanel.Submenu>
        )}
        {disabled.length > 0 && notDeployed.length === 0 && deployedAgents.length === 0 && (
          <Action
            title="No Enabled Agents"
            icon={Icon.Warning}
            onAction={() =>
              showToast({
                style: Toast.Style.Failure,
                title: "No enabled agents",
                message: "Enable an agent in the Agents command first.",
              })
            }
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Skill">
        <Action
          title="Update Skill"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
          onAction={update}
        />
        <Action.ShowInFinder title="Reveal in Finder" path={skill.path} />
        <Action.CopyToClipboard title="Copy Skill Name" content={skill.name} shortcut={Keyboard.Shortcut.Common.Copy} />
        {repoUrl && <Action.OpenInBrowser title="Open Source Repository" url={repoUrl} />}
      </ActionPanel.Section>

      <ActionPanel.Section title="Organize">
        <Action.Push
          title="Add Tags"
          icon={Icon.Tag}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          target={<TagForm skill={skill} knownTags={knownTags} onDone={onRefresh} />}
        />
        {skill.tags.length > 0 && (
          <ActionPanel.Submenu title="Remove Tag" icon={Icon.Minus}>
            {skill.tags.map((tag) => (
              <Action
                key={tag}
                title={tag}
                icon={Icon.Tag}
                onAction={() =>
                  runAction({
                    pending: `Removing tag ${tag}…`,
                    run: () => removeTag(skill.id, tag),
                    success: () => ({ title: `Removed tag “${tag}”` }),
                    failureTitle: "Could not remove tag",
                    onSuccess: onRefresh,
                  })
                }
              />
            ))}
          </ActionPanel.Submenu>
        )}
        {presets && presets.length > 0 && (
          <ActionPanel.Submenu title="Add to Preset" icon={Icon.Layers}>
            {presets
              .filter((preset) => !memberOf.has(preset.name))
              .map((preset) => (
                <Action
                  key={preset.id}
                  title={preset.name}
                  icon={Icon.Layers}
                  onAction={() =>
                    runAction({
                      pending: `Adding to ${preset.name}…`,
                      run: () => addSkillsToPreset(preset.id, [skill.id]),
                      success: () => ({
                        title: `Added to ${preset.name}`,
                        message: "Membership only — no agent files changed.",
                      }),
                      failureTitle: "Could not update preset",
                      onSuccess: onRefresh,
                    })
                  }
                />
              ))}
          </ActionPanel.Submenu>
        )}
        {skill.presets.length > 0 && presets && (
          <ActionPanel.Submenu title="Remove from Preset" icon={Icon.Minus}>
            {presets
              .filter((preset) => memberOf.has(preset.name))
              .map((preset) => (
                <Action
                  key={preset.id}
                  title={preset.name}
                  icon={Icon.Layers}
                  onAction={() =>
                    runAction({
                      pending: `Removing from ${preset.name}…`,
                      run: () => removeSkillsFromPreset(preset.id, [skill.id]),
                      success: () => ({
                        title: `Removed from ${preset.name}`,
                        message: "Membership only — deployed copies stay.",
                      }),
                      failureTitle: "Could not update preset",
                      onSuccess: onRefresh,
                    })
                  }
                />
              ))}
          </ActionPanel.Submenu>
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
        <Action
          title="Remove Skill"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={confirmRemove}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * Turns a source ref into a browsable URL, or null when it cannot be one.
 *
 * Only shapes that are certainly GitHub get rewritten to github.com. A
 * `git@gitlab.com:` or self-hosted ref is left alone and its action is hidden,
 * which is better than sending the user to a GitHub 404.
 */
function repositoryUrl(ref: string): string | null {
  if (/^https?:\/\//.test(ref)) return ref;

  // A bare `owner/repo` (optionally with a subpath) is the skills.sh shorthand,
  // which only ever means GitHub.
  if (/^[\w.-]+\/[\w.-]+(\/[\w.\-/]+)?$/.test(ref)) return `https://github.com/${ref}`;

  // scp-style remote: keep whatever host it names, and drop the .git suffix.
  const ssh = /^git@([\w.-]+):(.+?)(?:\.git)?$/.exec(ref);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;

  return null;
}
