import { Action, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { CliGuard } from "./components/CliGuard";
import { SkillActions } from "./components/SkillActions";
import { useAgents, usePresets, useSkills, useTags } from "./hooks/useLibrary";
import { SkillFilter } from "./lib/api";
import { agentName, sourceIcon, sourceLabel, tildePath } from "./lib/presentation";
import { Skill } from "./lib/types";

export default function Command() {
  return <CliGuard>{() => <MySkills />}</CliGuard>;
}

/**
 * Filters map onto the CLI's own flags rather than being applied client-side,
 * so the list stays honest even when the library is large. Free-text search
 * stays client-side (Raycast's built-in filtering) because it should feel instant.
 */
const ALL = "all";

function parseFilter(value: string): SkillFilter {
  if (value === ALL) return {};
  if (value === "untagged") return { untagged: true };
  if (value === "no-preset") return { noPreset: true };
  const [kind, ...rest] = value.split(":");
  const target = rest.join(":");
  switch (kind) {
    case "tag":
      return { tag: target };
    case "preset":
      return { preset: target };
    case "agent":
      return { deployedTo: target };
    case "source":
      return { source: target };
    default:
      return {};
  }
}

function MySkills() {
  const [filterValue, setFilterValue] = useState(ALL);
  const [showingDetail, setShowingDetail] = useState(false);

  const filter = parseFilter(filterValue);
  const skills = useSkills(filter);
  const agents = useAgents();
  const presets = usePresets();
  const tags = useTags();

  const installedAgents = (agents.data ?? []).filter((agent) => agent.installed && agent.enabled);

  // The dropdown value is persisted across launches, so it can outlive what it
  // points at. `skills list --preset <gone>` exits non-zero (unlike --tag, which
  // just returns nothing), which would raise a failure toast on every open, so
  // drop a filter whose target no longer exists. Presets are keyed by id here
  // rather than name so a rename does not break the filter at all.
  useEffect(() => {
    const [kind, ...rest] = filterValue.split(":");
    const target = rest.join(":");
    if (kind === "preset" && presets.data && !presets.data.some((preset) => preset.id === target)) {
      setFilterValue(ALL);
    }
    if (kind === "tag" && tags.data && !tags.data.includes(target)) setFilterValue(ALL);
    if (kind === "agent" && agents.data && !agents.data.some((agent) => agent.key === target)) setFilterValue(ALL);
  }, [filterValue, presets.data, tags.data, agents.data]);

  function refresh() {
    skills.revalidate();
    agents.revalidate();
    presets.revalidate();
    tags.revalidate();
  }

  return (
    <List
      isLoading={skills.isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search skills by name or description"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter library" value={filterValue} onChange={setFilterValue} storeValue>
          <List.Dropdown.Item title="All Skills" value={ALL} icon={Icon.List} />
          <List.Dropdown.Section title="Deployed To">
            {installedAgents.map((agent) => (
              <List.Dropdown.Item
                key={agent.key}
                title={agent.display_name}
                value={`agent:${agent.key}`}
                icon={Icon.Terminal}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Preset">
            {(presets.data ?? []).map((preset) => (
              <List.Dropdown.Item
                key={preset.id}
                title={preset.name}
                value={`preset:${preset.id}`}
                icon={Icon.Layers}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Tag">
            {(tags.data ?? []).map((tag) => (
              <List.Dropdown.Item key={tag} title={tag} value={`tag:${tag}`} icon={Icon.Tag} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Source">
            <List.Dropdown.Item title="Git" value="source:git" icon={Icon.Code} />
            <List.Dropdown.Item title="Local" value="source:local" icon={Icon.HardDrive} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Needs Attention">
            <List.Dropdown.Item title="Untagged" value="untagged" icon={Icon.Tag} />
            <List.Dropdown.Item title="Not in Any Preset" value="no-preset" icon={Icon.Layers} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Box}
        title={filterValue === ALL ? "No skills in your library" : "Nothing matches this filter"}
        description={
          filterValue === ALL
            ? "Use Search Skills to find one on the skills.sh marketplace."
            : "Try a different filter, or clear it to see the whole library."
        }
      />
      {(skills.data ?? []).map((skill) => (
        <List.Item
          key={skill.id}
          icon={sourceIcon(skill.source_type)}
          title={skill.name}
          subtitle={showingDetail ? undefined : skill.description}
          keywords={[...skill.tags, ...skill.presets, skill.source_type]}
          accessories={showingDetail ? undefined : accessoriesFor(skill, agents.data)}
          detail={<SkillDetailPane skill={skill} agentDisplay={(key) => agentName(agents.data, key)} />}
          actions={
            <SkillActions
              skill={skill}
              agents={agents.data}
              presets={presets.data}
              knownTags={tags.data ?? []}
              onRefresh={refresh}
            >
              <Action
                title={showingDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={() => setShowingDetail((value) => !value)}
              />
            </SkillActions>
          }
        />
      ))}
    </List>
  );
}

function accessoriesFor(skill: Skill, agents: ReturnType<typeof useAgents>["data"]): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  for (const tag of skill.tags.slice(0, 2)) {
    accessories.push({ tag: { value: tag, color: Color.SecondaryText }, tooltip: `Tag: ${tag}` });
  }

  if (skill.deployed_to.length > 0) {
    const names = skill.deployed_to.map((key) => agentName(agents, key)).join(", ");
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      text: String(skill.deployed_to.length),
      tooltip: `Deployed to ${names}`,
    });
  } else {
    accessories.push({
      icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
      tooltip: "In the library, not deployed to any agent",
    });
  }

  return accessories;
}

function SkillDetailPane({ skill, agentDisplay }: { skill: Skill; agentDisplay: (key: string) => string }) {
  return (
    <List.Item.Detail
      markdown={`# ${skill.name}\n\n${skill.description}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Source"
            text={sourceLabel(skill.source_type)}
            icon={sourceIcon(skill.source_type)}
          />
          {skill.source_ref && <List.Item.Detail.Metadata.Label title="Origin" text={tildePath(skill.source_ref)} />}
          <List.Item.Detail.Metadata.Separator />
          {skill.deployed_to.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Deployed To">
              {skill.deployed_to.map((key) => (
                <List.Item.Detail.Metadata.TagList.Item key={key} text={agentDisplay(key)} color={Color.Green} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Deployed To"
              text="No agents"
              icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
            />
          )}
          {skill.presets.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Presets">
              {skill.presets.map((preset) => (
                <List.Item.Detail.Metadata.TagList.Item key={preset} text={preset} color={Color.Blue} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {skill.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {skill.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Library Path" text={tildePath(skill.path)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
