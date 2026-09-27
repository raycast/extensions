import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, displayName, Person, showError, when } from "./api";
import { PersonActions, PersonDetail } from "./find-person";
import { withConnection } from "./connect";

function HotLeads() {
  const { data, isLoading, revalidate } = usePromise(
    async () => api<{ leads: Person[]; min_score: number }>("/hot-leads"),
    [],
    {
      onError: (e) => showError(e, "Could not load hot leads"),
    },
  );
  return (
    <List isLoading={isLoading} navigationTitle={data ? `Hot Leads (score ${data.min_score}+)` : "Hot Leads"}>
      <List.EmptyView
        icon={Icon.Temperature}
        title="No hot leads right now"
        description="A lead turns hot when what they do pushes their score over your line."
      />
      {(data?.leads || []).map((p) => (
        <List.Item
          key={p.key}
          icon={{ source: Icon.Temperature, tintColor: Color.Red }}
          title={displayName(p)}
          subtitle={[p.company, p.email || p.phone].filter(Boolean).join(" · ")}
          accessories={[{ tag: { value: String(p.lead_score ?? ""), color: Color.Red } }, { text: when(p.last_seen) }]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" icon={Icon.Sidebar} target={<PersonDetail personKey={p.key} />} />
              <PersonActions p={p} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withConnection(HotLeads);
