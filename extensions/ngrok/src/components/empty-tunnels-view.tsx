import { ActionPanel, List } from "@raycast/api";

import BaseActions from "./base-actions";
import StopAgentAction from "./stop-agent-action";

type Props = {
  tunnelSessionId: string;
  goToCreate: () => void;
  reload: () => void;
};

export default function EmptyTunnelsView({ tunnelSessionId, goToCreate, reload }: Props) {
  return (
    <List.Item
      title="No tunnels"
      actions={
        <ActionPanel>
          <BaseActions goToCreate={goToCreate} reload={reload} />
          <ActionPanel.Section title="Danger zone">
            <StopAgentAction tunnelSessionId={tunnelSessionId} revalidateTunelSessions={reload} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
