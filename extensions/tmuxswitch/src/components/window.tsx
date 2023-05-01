import { ActionPanel, Action, List, closeMainWindow } from "@raycast/api";
import { Tmux } from "../tmux/tmux";

export default function WindowItem({
  tmux,
  win_id,
  win_name,
}: {
  tmux: Tmux;
  win_id: string;
  win_name: string;
}) {
  return (
    <List.Item
      icon="list-icon.png"
      key={win_id}
      id={win_id}
      title={win_name}
      subtitle={tmux.current_session()}
      actions={
        <ActionPanel>
          <Action
            title="Switch to Window"
            onAction={() => {
              closeMainWindow({ clearRootSearch: true });
              tmux.switch_client(win_id);
              Tmux.switch_to_iterm2(tmux.current_session());
            }}
          />
        </ActionPanel>
      }
    />
  );
}
