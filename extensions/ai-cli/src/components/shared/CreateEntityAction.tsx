import { Action, ActionPanel, Icon } from "@raycast/api";

interface CreateEntityActionProps {
  title: string;
  onAction: () => void;
  wrapInPanel?: boolean;
}

export default function CreateEntityAction({ title, onAction, wrapInPanel = false }: CreateEntityActionProps) {
  const action = (
    <Action title={title} icon={Icon.Plus} onAction={onAction} shortcut={{ modifiers: ["cmd" as const], key: "n" }} />
  );

  if (wrapInPanel) {
    return <ActionPanel>{action}</ActionPanel>;
  }

  return action;
}
