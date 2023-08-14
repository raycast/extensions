import { Action, Icon, confirmAlert } from "@raycast/api";

export default function DeleteStorybookAction(props: { id: string; onDelete: (id: string) => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Storybook"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        if (await confirmAlert({ title: "Are you sure?" })) {
          props.onDelete(props.id);
        }
      }}
    />
  );
}
