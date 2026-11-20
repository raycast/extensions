import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ToolAction } from "./components/actions";
import { ToolList } from "./components/ToolList";
import { pick } from "./lib/format";
import { fmtDate } from "./lib/theme";
import { RecordCard } from "./components/RecordCard";

export default function Command() {
  return (
    <ToolList
      tool="list_jobs"
      arrayKeys={["jobs", "items", "results"]}
      label="Open jobs"
      itemDetail={(o) => <RecordCard item={o} label="Job" />}
      searchArg="query"
      searchPlaceholder="Search jobs by keyword (Pro)…"
      paged="offset"
      pageSize={25}
      itemTitle={(o) => pick(o, ["title"])}
      itemSubtitle={(o) => pick(o, ["company", "company_name"])}
      accessories={(o) => {
        const a: List.Item.Accessory[] = [];
        const loc = pick(o, ["location"]);
        if (loc) a.push({ text: loc });
        if (o.role_type) a.push({ tag: String(o.role_type) });
        const d = fmtDate(o.posted_at ?? o.created_at);
        if (d) a.push({ text: d });
        return a;
      }}
      itemActions={(o) => {
        const apply = pick(o, ["apply_url", "url", "link"]);
        const id = Number(o.job_id ?? o.id);
        return (
          <>
            {apply && /^https?:/.test(apply) && <Action.OpenInBrowser title="Apply / Open Posting" url={apply} />}
            {Number.isFinite(id) && (
              <ActionPanel.Section title="If this is your job">
                <ToolAction tool="manage_job" preset={{ job_id: id, action: "edit" }} form title="Edit Job…" icon={Icon.Pencil} />
                <ToolAction tool="manage_job" preset={{ job_id: id, action: "close" }} title="Close Job" icon={Icon.XMarkCircle} />
                <ToolAction tool="manage_job" preset={{ job_id: id, action: "remove" }} title="Remove Job" icon={Icon.Trash} />
              </ActionPanel.Section>
            )}
          </>
        );
      }}
      listActions={() => <ToolAction tool="post_job" form title="Post a Job on My Listing…" icon={Icon.Plus} />}
    />
  );
}
