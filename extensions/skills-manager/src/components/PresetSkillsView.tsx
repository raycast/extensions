import { Action, Color, Icon, List } from "@raycast/api";
import { addSkillsToPreset, removeSkillsFromPreset } from "../lib/api";
import { useAgents, usePresets, useSkills } from "../hooks/useLibrary";
import { useCliAction } from "../hooks/useCliAction";
import { agentName, sourceIcon } from "../lib/presentation";
import { Preset } from "../lib/types";
import { SkillActions } from "./SkillActions";

/**
 * The members of one preset, alongside the rest of the library so skills can be
 * moved in and out from a single view.
 *
 * Membership is organization only: nothing here changes what an agent can see
 * until the preset is deployed, and the copy says so.
 */
export function PresetSkillsView({
  preset,
  knownTags,
  onChanged,
}: {
  preset: Preset;
  knownTags: string[];
  onChanged: () => void;
}) {
  const runAction = useCliAction();
  const agents = useAgents();
  const presets = usePresets();

  // useSkills rather than an ad-hoc useCachedPromise: the cache namespace is
  // derived from the fetcher's source text, so a private copy would never share
  // the frame My Skills already loaded, and its revalidate would not reach it.
  const all = useSkills();

  function refresh() {
    all.revalidate();
    presets.revalidate();
    onChanged();
  }

  const members = (all.data ?? []).filter((skill) => skill.preset_ids.includes(preset.id));
  const others = (all.data ?? []).filter((skill) => !skill.preset_ids.includes(preset.id));

  return (
    <List
      isLoading={all.isLoading}
      navigationTitle={preset.name}
      searchBarPlaceholder={`Search skills in and out of ${preset.name}`}
    >
      <List.Section title="In This Preset" subtitle={String(members.length)}>
        {members.map((skill) => (
          <List.Item
            key={skill.id}
            icon={sourceIcon(skill.source_type)}
            title={skill.name}
            subtitle={skill.description}
            accessories={
              skill.deployed_to.length > 0
                ? [
                    {
                      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                      text: String(skill.deployed_to.length),
                      tooltip: `Deployed to ${skill.deployed_to.map((key) => agentName(agents.data, key)).join(", ")}`,
                    },
                  ]
                : undefined
            }
            actions={
              <SkillActions
                skill={skill}
                agents={agents.data}
                presets={presets.data}
                knownTags={knownTags}
                onRefresh={refresh}
              >
                <Action
                  title={`Remove from ${preset.name}`}
                  icon={Icon.Minus}
                  onAction={() =>
                    runAction({
                      pending: `Removing ${skill.name} from ${preset.name}…`,
                      run: () => removeSkillsFromPreset(preset.id, [skill.id]),
                      success: () => ({
                        title: `Removed ${skill.name} from ${preset.name}`,
                        message: "Membership only — deployed copies stay where they are.",
                      }),
                      failureTitle: "Could not update preset",
                      onSuccess: refresh,
                    })
                  }
                />
              </SkillActions>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Rest of Library" subtitle={String(others.length)}>
        {others.map((skill) => (
          <List.Item
            key={skill.id}
            icon={sourceIcon(skill.source_type)}
            title={skill.name}
            subtitle={skill.description}
            actions={
              <SkillActions
                skill={skill}
                agents={agents.data}
                presets={presets.data}
                knownTags={knownTags}
                onRefresh={refresh}
              >
                <Action
                  title={`Add to ${preset.name}`}
                  icon={Icon.Plus}
                  onAction={() =>
                    runAction({
                      pending: `Adding ${skill.name} to ${preset.name}…`,
                      run: () => addSkillsToPreset(preset.id, [skill.id]),
                      success: () => ({
                        title: `Added ${skill.name} to ${preset.name}`,
                        message: "Membership only — deploy the preset to make agents see it.",
                      }),
                      failureTitle: "Could not update preset",
                      onSuccess: refresh,
                    })
                  }
                />
              </SkillActions>
            }
          />
        ))}
      </List.Section>

      <List.EmptyView icon={Icon.Box} title="No skills in your library yet" />
    </List>
  );
}
