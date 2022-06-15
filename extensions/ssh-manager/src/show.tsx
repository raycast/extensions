import { List, ActionPanel, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { ISSHConnection } from "./types";
import { getConnections, saveConnections } from "./storage.api";

async function runTerminal(item: ISSHConnection) {
  let identity = "";
  if (item.sshKey) {
    identity = `-i ${item.sshKey} `;
  }
  const command = `ssh ${identity} ${item.user}@${item.address}`;

  const script = `
    tell application "Terminal"
      do script ""  
      activate
      set position of front window to {1, 1}
      set shell to do script "${command}" in window 1
    end tell
    
    tell application "System Events" to tell process "Terminal"
        set frontmost to true
        windows where title contains "bash"
        if result is not {} then perform action "AXRaise" of item 1 of result
    end tell
  `;

  await runAppleScript(script);
  await showHUD("Success ✅");
}

export default function Command() {
  const [connectionsList, setConnectionsList] = useState<ISSHConnection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const items: ISSHConnection[] = await getConnections();

      setConnectionsList(items);
      setLoading(false);
    })();
  }, []);

  async function removeItem(item: ISSHConnection) {
    let items: ISSHConnection[] = await getConnections();
    items = items.filter((i) => i.id !== item.id);

    await saveConnections(items);
    setConnectionsList(items);
  }

  return (
    <List isLoading={loading}>
      {connectionsList.map((item) => {
        return (
          <List.Item
            actions={<Action item={item} onItemRemove={removeItem} />}
            id={item.id}
            key={item.name}
            title={item.name}
            subtitle={getSubtitle(item)}
          />
        );
      })}
    </List>
  );
}

function Action({
  item,
  onItemRemove,
}: {
  item: ISSHConnection;
  onItemRemove: (item: ISSHConnection) => Promise<void>;
}) {
  return (
    <>
      <ActionPanel>
        <ActionPanel.Item
          title="Connect"
          onAction={async () => {
            await runTerminal(item);
          }}
        />
        <ActionPanel.Item
          title="Remove"
          onAction={async () => {
            await onItemRemove(item);
          }}
        />
      </ActionPanel>
    </>
  );
}

function getSubtitle(item: ISSHConnection) {
  return `${item.user}@${item.address}${item.sshKey ? " SSH Key:" + item.sshKey : ""}`;
}
