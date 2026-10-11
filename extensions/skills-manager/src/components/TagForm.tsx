import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { addTags } from "../lib/api";
import { useCliAction } from "../hooks/useCliAction";
import { Skill } from "../lib/types";

/** Adds one or more tags to a skill. Existing tags are offered so they stay consistent. */
export function TagForm({ skill, knownTags, onDone }: { skill: Skill; knownTags: string[]; onDone: () => void }) {
  const runAction = useCliAction();
  const { pop } = useNavigation();

  const suggestions = knownTags.filter((tag) => !skill.tags.includes(tag));

  // `tags` is absent from the submitted values whenever the picker below was not
  // rendered, which is every time there is nothing to reuse — including the very
  // first tag anyone adds to a fresh library.
  async function submit(values: { tags?: string[]; newTag: string }) {
    const fresh = values.newTag
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const all = [...new Set([...(values.tags ?? []), ...fresh])];
    if (all.length === 0) {
      pop();
      return;
    }

    await runAction({
      pending: `Tagging ${skill.name}…`,
      run: () => addTags(skill.id, all),
      success: () => ({ title: `Tagged ${skill.name}`, message: all.join(", ") }),
      failureTitle: "Could not add tags",
      onSuccess: () => {
        onDone();
        pop();
      },
    });
  }

  return (
    <Form
      navigationTitle={`Tag ${skill.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Tags" icon={Icon.Tag} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {suggestions.length > 0 && (
        <Form.TagPicker id="tags" title="Existing Tags" placeholder="Reuse a tag">
          {suggestions.map((tag) => (
            <Form.TagPicker.Item key={tag} value={tag} title={tag} icon={Icon.Tag} />
          ))}
        </Form.TagPicker>
      )}
      <Form.TextField id="newTag" title="New Tags" placeholder="frontend, testing" defaultValue="" />
      <Form.Description
        title="Note"
        text="Tags organize the library only. They do not change what any agent can see."
      />
    </Form>
  );
}
