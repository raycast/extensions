import { Action, Color, Icon, List } from "@raycast/api";
import { undeploySkills } from "../lib/api";
import { useAgents, usePresets, useSkills, useTags } from "../hooks/useLibrary";
import { useCliAction } from "../hooks/useCliAction";
import { sourceIcon, tildePath } from "../lib/presentation";
import { Agent } from "../lib/types";
import { SkillActions } from "./SkillActions";

/** Everything Skills Manager has deployed into one agent's skills directory. */
/**
 * `onChanged` reaches back to the Agents list. Its per-agent skill count comes
 * from a different cached query than this view's, and Action.Push keeps it
 * mounted, so without this an undeploy here leaves the parent showing a count
 * that is too high — which then feeds the "this removes all N skills" wording
 * in the disable-agent confirmation.
 */
export function AgentSkillsView({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const runAction = useCliAction();
  const agents = useAgents();
  const presets = usePresets();
  const tags = useTags();

  // Shares My Skills' cache for the same filter, so this paints from the last
  // known frame instead of cold, and a revalidate here refreshes both.
  const deployed = useSkills({ deployedTo: agent.key });

  function refresh() {
    deployed.revalidate();
    onChanged();
  }

  return (
    <List
      isLoading={deployed.isLoading}
      navigationTitle={agent.display_name}
      searchBarPlaceholder={`Search skills deployed to ${agent.display_name}`}
    >
      <List.EmptyView
        icon={Icon.Box}
        title={`Nothing deployed to ${agent.display_name}`}
        description={tildePath(agent.skills_dir)}
      />
      {(deployed.data ?? []).map((skill) => (
        <List.Item
          key={skill.id}
          icon={sourceIcon(skill.source_type)}
          title={skill.name}
          subtitle={skill.description}
          accessories={[
            {
              icon: { source: Icon.CheckCircle, tintColor: Color.Green },
              tooltip: tildePath(`${agent.skills_dir}/${skill.name}`),
            },
          ]}
          actions={
            <SkillActions
              skill={skill}
              agents={agents.data}
              presets={presets.data}
              knownTags={tags.data ?? []}
              onRefresh={refresh}
            >
              <Action
                title={`Undeploy from ${agent.display_name}`}
                icon={Icon.Eject}
                onAction={() =>
                  runAction({
                    pending: `Removing ${skill.name} from ${agent.display_name}…`,
                    run: () => undeploySkills([skill.id], [agent.key]),
                    success: () => ({
                      title: `Removed from ${agent.display_name}`,
                      message: "The library copy is untouched.",
                    }),
                    failureTitle: "Could not undeploy",
                    onSuccess: refresh,
                  })
                }
              />
            </SkillActions>
          }
        />
      ))}
    </List>
  );
}
