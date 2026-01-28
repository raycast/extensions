import { ActionPanel, Icon, List } from "@raycast/api";

import BaseActions from "./base-actions";

type Props = {
  goToCreate: () => void;
  reload: () => void;
};

export default function EmptySessionsView({ goToCreate, reload }: Props) {
  return (
    <List.EmptyView
      icon={Icon.Link}
      title="Create ngrok tunnel"
      description="⌘ + N"
      actions={
        <ActionPanel>
          <BaseActions goToCreate={goToCreate} reload={reload} />
        </ActionPanel>
      }
    />
  );
}
