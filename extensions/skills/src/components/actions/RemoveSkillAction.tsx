import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Color,
  useNavigation,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import type { InstalledSkill } from "../../shared";
import { removeSkill } from "../../utils/skills-cli";
import type { MutateSkills } from "../../hooks/useInstalledSkills";

interface RemoveSkillActionProps {
  skill: InstalledSkill;
  mutate: MutateSkills;
}

function AgentPickerForm({ skill, mutate }: RemoveSkillActionProps) {
  const { pop } = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selected.size === skill.agents.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(skill.agents));
  }

  function toggleAgent(agent: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(agent);
      } else {
        next.delete(agent);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one agent" });
      return;
    }

    const agents = [...selected];
    const isAll = agents.length === skill.agents.length;
    const label = isAll ? "all agents" : agents.join(", ");
    const confirmed = await confirmAlert({
      title: isAll ? `Remove "${skill.name}"?` : `Remove "${skill.name}" from ${label}?`,
      message: isAll
        ? "This will remove the skill from all agents."
        : `This will remove the skill from ${agents.length} agent${agents.length > 1 ? "s" : ""}.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing skill..." });
    try {
      const removedSet = new Set(agents);
      pop();
      await mutate(removeSkill(skill.name, isAll ? undefined : agents), {
        optimisticUpdate: (skills) => {
          if (!skills) return [];
          if (isAll) return skills.filter((s) => s.name !== skill.name);
          return skills
            .map((s) =>
              s.name === skill.name
                ? { ...s, agents: s.agents.filter((a) => !removedSet.has(a)), agentCount: s.agentCount - agents.length }
                : s,
            )
            .filter((s) => s.agents.length > 0);
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = isAll ? "Skill removed" : `Skill removed from ${label}`;
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Failed to remove skill" });
    }
  }

  return (
    <Form
      navigationTitle={`Remove "${skill.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Remove" icon={Icon.Trash} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Select agents to remove "${skill.name}" from:`} />
      <Form.Checkbox id="select-all" label="Select All" value={allSelected} onChange={toggleAll} />
      <Form.Separator />
      {skill.agents.map((agent) => (
        <Form.Checkbox
          key={agent}
          id={agent}
          label={agent}
          value={selected.has(agent)}
          onChange={(checked) => toggleAgent(agent, checked)}
        />
      ))}
    </Form>
  );
}

export function RemoveSkillAction({ skill, mutate }: RemoveSkillActionProps) {
  if (skill.agents.length > 1) {
    return (
      <Action.Push
        title="Remove Skill"
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        target={<AgentPickerForm skill={skill} mutate={mutate} />}
      />
    );
  }

  return (
    <Action
      title="Remove Skill"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: `Remove "${skill.name}"?`,
          message: "This will remove the skill from all agents.",
          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        const toast = await showToast({ style: Toast.Style.Animated, title: "Removing skill..." });
        try {
          await mutate(removeSkill(skill.name), {
            optimisticUpdate: (skills) => (skills ? skills.filter((s) => s.name !== skill.name) : []),
          });
          toast.style = Toast.Style.Success;
          toast.title = "Skill removed";
        } catch (error) {
          await toast.hide();
          await showFailureToast(error, { title: "Failed to remove skill" });
        }
      }}
    />
  );
}
