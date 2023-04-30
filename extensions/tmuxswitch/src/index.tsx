import { getPreferenceValues, List } from "@raycast/api";
import { Tmux } from "./tmux/tmux";
import WindowItem from "./components/window";

interface Preferences {
  tmuxPath: string;
  sessionName: string;
  socketPath: string;
}

const preferences = getPreferenceValues<Preferences>();
const tmux = new Tmux(
  preferences.tmuxPath,
  preferences.sessionName,
  preferences.socketPath
);
const items = tmux.list_window(true);

export default function Command() {
  return (
    <List>
      {Object.entries(items).map(([id, name]) => (
        <WindowItem tmux={tmux} win_id={id} win_name={name} />
      ))}
    </List>
  );
}
