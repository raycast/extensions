import { Icon } from "@raycast/api";
import { ToolAction } from "./components/actions";
import { ToolList } from "./components/ToolList";
import { pick } from "./lib/format";
import { statusColor } from "./lib/render";
import { RecordCard } from "./components/RecordCard";

export default function Command() {
  return (
    <ToolList
      tool="list_my_tickets"
      arrayKeys={["tickets", "items", "results"]}
      itemTitle={(o) => pick(o, ["subject", "title", "reference", "id"])}
      itemSubtitle={(o) => pick(o, ["reference", "ref", "category"])}
      label="Support tickets"
      itemDetail={(o) => <RecordCard item={o} label="Ticket" />}
      accessories={(o) => (o.status ? [{ tag: { value: String(o.status), color: statusColor(String(o.status)) } }] : [])}
      emptyTitle="No support tickets"
      itemActions={(o) => {
        const ref = pick(o, ["reference", "ref", "ticket", "id"]);
        if (!ref) return null;
        return (
          <>
            <ToolAction tool="list_my_tickets" preset={{ ticket: ref }} title="Read Full Thread" icon={Icon.Message} />
            <ToolAction tool="reply_to_ticket" preset={{ ticket: ref }} form title="Reply…" icon={Icon.Reply} />
          </>
        );
      }}
      listActions={() => <ToolAction tool="create_support_ticket" form title="Open New Ticket…" icon={Icon.Plus} />}
    />
  );
}
