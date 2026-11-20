import { ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ToolAction } from "./components/actions";
import { ToolList } from "./components/ToolList";
import { Obj, pick } from "./lib/format";
import { fmtDate } from "./lib/theme";
import { statusColor } from "./lib/render";
import { RecordCard } from "./components/RecordCard";

const VIEWS: Record<string, { box: string; status?: string; title: string }> = {
  received: { box: "received", title: "Received · all" },
  new: { box: "received", status: "new", title: "Received · new" },
  contacted: { box: "received", status: "contacted", title: "Received · contacted" },
  qualified: { box: "received", status: "qualified", title: "Received · qualified" },
  won: { box: "received", status: "won", title: "Received · won" },
  lost: { box: "received", status: "lost", title: "Received · lost" },
  archived: { box: "archived", title: "Archived" },
  sent: { box: "sent", title: "Sent by me" },
};
const STATUSES = ["new", "contacted", "qualified", "won", "lost"];

const leadId = (o: Obj) => {
  const v = o.lead_id ?? o.id;
  return typeof v === "number" ? v : Number(v);
};

export default function Command() {
  const [view, setView] = useState("new");
  const v = VIEWS[view];
  return (
    <ToolList
      tool="list_leads"
      args={{ box: v.box, status: v.status }}
      paged="page"
      pageSize={20}
      title={`Leads · ${v.title}`}
      arrayKeys={["leads", "items", "results", "conversations"]}
      itemTitle={(o) => pick(o, ["looking_for", "subject", "name", "sender_name", "inquirer_name"])}
      itemSubtitle={(o) => pick(o, ["listing_name", "listing", "company", "status"])}
      label={v.title}
      itemDetail={(o) => <RecordCard item={o} label="Lead" />}
      accessories={(o) => {
        const a: List.Item.Accessory[] = [];
        const d = fmtDate(o.created_at ?? o.updated_at ?? o.last_message_at);
        if (d) a.push({ text: d });
        if (o.status) a.push({ tag: { value: String(o.status), color: statusColor(String(o.status)) } });
        return a;
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Inbox" value={view} onChange={setView}>
          {Object.entries(VIEWS).map(([k, x]) => (
            <List.Dropdown.Item key={k} value={k} title={x.title} />
          ))}
        </List.Dropdown>
      }
      itemActions={(o) => {
        const id = leadId(o);
        if (!Number.isFinite(id)) return null;
        return (
          <>
            <ToolAction tool="get_lead" preset={{ lead_id: id }} title="Read Conversation" icon={Icon.Message} />
            <ToolAction tool="reply_to_lead" preset={{ lead_id: id }} form title="Reply…" icon={Icon.Reply} />
            <ActionPanel.Submenu title="Set Status" icon={Icon.Tag}>
              {STATUSES.map((s) => (
                <ToolAction key={s} tool="set_lead_status" preset={{ lead_id: id, status: s }} title={`Mark ${s}`} icon={Icon.Dot} />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Section title="Housekeeping">
              <ToolAction tool="manage_lead" preset={{ lead_id: id, action: "archive" }} title="Archive" icon={Icon.Tray} />
              <ToolAction
                tool="manage_lead"
                preset={{ lead_id: id, action: "unarchive" }}
                title="Restore from Archive"
                icon={Icon.ArrowUp}
              />
              <ToolAction tool="manage_lead" preset={{ lead_id: id, action: "delete" }} title="Delete Permanently" icon={Icon.Trash} />
            </ActionPanel.Section>
          </>
        );
      }}
      listActions={() => <ToolAction tool="start_lead" form title="Contact a Business…" icon={Icon.Envelope} />}
    />
  );
}
