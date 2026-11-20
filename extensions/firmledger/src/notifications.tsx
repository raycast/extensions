import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { ToolAction } from "./components/actions";
import { ToolList } from "./components/ToolList";
import { pick } from "./lib/format";
import { fmtDate } from "./lib/theme";
import { RecordCard } from "./components/RecordCard";

export default function Command() {
  const [unread, setUnread] = useState(true);
  return (
    <ToolList
      tool="get_notifications"
      args={{ unread_only: unread || undefined, limit: 60 }}
      arrayKeys={["notifications", "items", "results"]}
      itemTitle={(o) => pick(o, ["title", "message", "text", "body", "type"])}
      label="Notifications"
      itemDetail={(o) => <RecordCard item={o} label="Notification" />}
      itemSubtitle={(o) => fmtDate(pick(o, ["created_at", "date"]))}
      accessories={(o) => (o.read === false || o.is_read === false || o.read_at === null ? [{ icon: Icon.Dot, tooltip: "Unread" }] : [])}
      emptyTitle={unread ? "No unread notifications" : "No notifications"}
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={unread ? "unread" : "all"} onChange={(v) => setUnread(v === "unread")}>
          <List.Dropdown.Item value="unread" title="Unread only" />
          <List.Dropdown.Item value="all" title="All" />
        </List.Dropdown>
      }
      itemActions={(o) => {
        const id = Number(o.notification_id ?? o.id);
        return Number.isFinite(id) ? (
          <ToolAction tool="mark_notifications_read" preset={{ notification_id: id }} title="Mark as Read" icon={Icon.Check} />
        ) : null;
      }}
      listActions={() => (
        <ToolAction tool="mark_notifications_read" preset={{ all: true }} title="Mark All as Read" icon={Icon.CheckCircle} />
      )}
    />
  );
}
