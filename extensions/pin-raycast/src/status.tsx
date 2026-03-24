import { List, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getStatus, isAgentRunning, AgentStatus } from "./utils/agent-ipc";

export default function Command() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [agentRunning, setAgentRunning] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const running = await isAgentRunning();
      setAgentRunning(running);

      if (running) {
        const s = await getStatus();
        setStatus(s);
      }
      setLoading(false);
    }
    fetchStatus();
  }, []);

  if (loading) {
    return <List isLoading={true} />;
  }

  if (!agentRunning) {
    return (
      <List>
        <List.Item
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Agent Not Running"
          subtitle="Use 'Launch Agent' command to start"
        />
      </List>
    );
  }

  if (!status) {
    return (
      <List>
        <List.Item
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="Unable to get status"
          subtitle="Agent may be busy or unresponsive"
        />
      </List>
    );
  }

  const stateIcon = status.pinned
    ? { source: Icon.Pin, tintColor: Color.Green }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };

  return (
    <List>
      <List.Item
        icon={stateIcon}
        title="State"
        subtitle={status.state}
        accessories={[{ text: status.pinned ? "Pinned" : "Idle" }]}
      />
      {status.pinned && (
        <>
          <List.Item
            icon={Icon.AppWindow}
            title="Target Application"
            subtitle={status.targetAppName || "Unknown"}
          />
          <List.Item
            icon={Icon.Document}
            title="Window Title"
            subtitle={status.targetWindowTitle || "Unknown"}
          />
          <List.Item
            icon={status.mirrorVisible ? Icon.Eye : Icon.EyeSlash}
            title="Mirror Visible"
            subtitle={status.mirrorVisible ? "Yes" : "Hidden"}
          />
          {status.pinnedSince && (
            <List.Item
              icon={Icon.Clock}
              title="Pinned Since"
              subtitle={new Date(status.pinnedSince).toLocaleString()}
            />
          )}
        </>
      )}
    </List>
  );
}
