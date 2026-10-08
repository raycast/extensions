import { useState, useEffect, useMemo } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { getBroadcasts, pauseBroadcast, resumeBroadcast, Broadcast } from "./api";
import BroadcastDetail from "./broadcast-detail";
import { formatRelativeTime } from "./utils/format-date";
import { getStateColor } from "./utils/colors";
import { formatState, formatTypeName } from "./utils/formatters";

function getTypeIcon(type?: string): Icon {
  switch (type) {
    case "email":
      return Icon.Envelope;
    case "webhook":
      return Icon.Globe;
    case "push":
      return Icon.Bell;
    case "slack":
      return Icon.Message;
    case "twilio":
    case "sms":
      return Icon.Phone;
    case "in_app":
      return Icon.AppWindow;
    default:
      return Icon.Megaphone;
  }
}

export default function BroadcastList() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    getBroadcasts()
      .then(setBroadcasts)
      .catch((error) => {
        showToast({ title: "Error loading broadcasts", message: error.message, style: Toast.Style.Failure });
        setBroadcasts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const uniqueTypes = useMemo(() => {
    const types = Array.from(new Set(broadcasts.map((b) => b.type).filter(Boolean) as string[])).sort();
    return types;
  }, [broadcasts]);

  const filteredBroadcasts = useMemo(() => {
    const filtered =
      selectedType === "all" ? broadcasts : broadcasts.filter((broadcast) => broadcast.type === selectedType);
    return filtered.sort((a, b) => b.created - a.created);
  }, [broadcasts, selectedType]);

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" value={selectedType} onChange={setSelectedType}>
          <List.Dropdown.Item title="All Types" value="all" />
          {uniqueTypes.map((type) => (
            <List.Dropdown.Item key={type} title={formatTypeName(type)} value={type} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredBroadcasts.map((broadcast) => (
        <List.Item
          key={broadcast.id}
          icon={{ source: getTypeIcon(broadcast.type), tintColor: Color.Blue }}
          title={broadcast.name}
          subtitle={formatTypeName(broadcast.type)}
          accessories={[
            { tag: { value: formatState(broadcast.state), color: getStateColor(broadcast.state) } },
            ...(broadcast.created_by ? [{ text: broadcast.created_by }] : []),
            { text: formatRelativeTime(broadcast.created) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Open Details" target={<BroadcastDetail id={broadcast.id} />} />
              <Action
                title="Pause Broadcast"
                icon={Icon.Pause}
                onAction={async () => {
                  try {
                    await pauseBroadcast(broadcast.id);
                    await showToast({ title: "Broadcast paused", style: Toast.Style.Success });
                    const updated = await getBroadcasts();
                    setBroadcasts(updated);
                  } catch (error) {
                    await showToast({
                      title: "Failed to pause",
                      message: (error as Error).message,
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
              <Action
                title="Resume Broadcast"
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    await resumeBroadcast(broadcast.id);
                    await showToast({ title: "Broadcast resumed", style: Toast.Style.Success });
                    const updated = await getBroadcasts();
                    setBroadcasts(updated);
                  } catch (error) {
                    await showToast({
                      title: "Failed to resume",
                      message: (error as Error).message,
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
