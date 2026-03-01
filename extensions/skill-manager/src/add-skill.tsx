import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Skill, upsertSkill } from "./utils/skills";

interface Props {
  existingSkill?: Skill;
  /** Called after a successful save so the parent can refresh its list */
  onSave?: () => void;
}

export default function AddSkill({ existingSkill, onSave }: Props) {
  const { pop } = useNavigation();
  const isEditing = !!existingSkill;

  const [nameError, setNameError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; description: string; tags: string }) {
    const name = values.name.trim();
    const description = values.description.trim();
    const tags = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!name) {
      setNameError("Name is required");
      return;
    }

    const skill: Skill = { name, description, tags };

    try {
      await upsertSkill(skill);
      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Skill updated" : "Skill added",
        message: name,
      });
      onSave?.();
      pop();
    } catch (err: unknown) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to save skill", message: String(err) });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit: ${existingSkill!.name}` : "Add Skill"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Update Skill" : "Add Skill"}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Skill Name"
        placeholder="e.g. TypeScript, React Hooks, TDD"
        defaultValue={existingSkill?.name ?? ""}
        error={nameError}
        onChange={() => setNameError(undefined)}
        info="The name of the skill. This will be used as the snippet keyword."
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Describe the skill, best practices, rules, or notes…"
        defaultValue={existingSkill?.description ?? ""}
        enableMarkdown
        info="Supports Markdown. This content is stored in central and synced to selected coding agents."
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="e.g. frontend, testing, typescript"
        defaultValue={existingSkill?.tags.join(", ") ?? ""}
        info="Comma-separated list of tags for filtering."
      />
    </Form>
  );
}
