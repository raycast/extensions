import { Action, ActionPanel, Form, Icon, popToRoot, showHUD } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { createGroupUrl } from "./ulysses-url";
import { getPreferences, openUlyssesCallback } from "./utils";

interface Values {
  group_name: string;
  parent: string;
}

export default function NewGroup() {
  const { handleSubmit, itemProps } = useForm<Values>({
    validation: { group_name: (value) => (value?.trim() ? undefined : "Enter a group name") },
    async onSubmit(values) {
      const background = !getPreferences().showInUlysses;
      const url = createGroupUrl({ name: values.group_name, parent: values.parent, silent: background });
      if (await openUlyssesCallback(url, { background })) {
        await showHUD(`Created ${values.group_name.trim()}`);
        await popToRoot();
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Group" icon={Icon.NewFolder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Group Name" placeholder="Enter Group Name" autoFocus {...itemProps.group_name} />
      <Form.TextField
        title="Parent Group"
        placeholder="Top level"
        info="A group name or a path like /Blog. Leave empty, or use a group that doesn't exist, to create it at the top level."
        {...itemProps.parent}
      />
    </Form>
  );
}
