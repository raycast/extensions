import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { api, displayName, LastMessage, Person, showError, when } from "./api";
import { withConnection } from "./connect";

function FindPerson() {
  const [q, setQ] = useState("");
  const { data, isLoading } = usePromise(
    async (query: string) => (await api<{ people: Person[] }>(`/people?q=${encodeURIComponent(query)}`)).people,
    [q],
    { onError: (e) => showError(e, "Could not search people") },
  );
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQ}
      throttle
      searchBarPlaceholder="Search name, email, phone, company…"
    >
      <List.EmptyView icon={Icon.PersonCircle} title={q ? "No one matches" : "No people yet"} />
      {(data || []).map((p) => (
        <List.Item
          key={p.key}
          icon={{ source: Icon.PersonCircle, tintColor: p.is_lead ? Color.Orange : Color.SecondaryText }}
          title={displayName(p)}
          subtitle={[p.company, p.email || p.phone].filter(Boolean).join(" · ")}
          accessories={[
            ...(p.lead_score != null
              ? [
                  {
                    tag: { value: String(p.lead_score), color: p.lead_score >= 80 ? Color.Red : Color.SecondaryText },
                    tooltip: "Lead score",
                  },
                ]
              : []),
            { text: p.channel },
            { text: when(p.last_seen) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" icon={Icon.Sidebar} target={<PersonDetail personKey={p.key} />} />
              <PersonActions p={p} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** ⌘⇧<key> on Mac, Ctrl+Shift+<key> on Windows. */
const sc = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", "shift"], key },
  Windows: { modifiers: ["ctrl", "shift"], key },
});

export function PersonActions({ p, dashboardUrl }: { p: Person; dashboardUrl?: string }) {
  const tel = p.phone.replace(/[^\d+]/g, "");
  return (
    <>
      {tel ? <Action.OpenInBrowser title="Call" icon={Icon.Phone} url={`tel:${tel}`} shortcut={sc("c")} /> : null}
      {tel ? <Action.OpenInBrowser title="Text" icon={Icon.Message} url={`sms:${tel}`} shortcut={sc("t")} /> : null}
      {p.email ? (
        <Action.OpenInBrowser title="Email" icon={Icon.Envelope} url={`mailto:${p.email}`} shortcut={sc("e")} />
      ) : null}
      {dashboardUrl ? (
        <Action.OpenInBrowser
          title="Open in BABAV"
          icon={Icon.Globe}
          url={dashboardUrl}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      ) : null}
      <ActionPanel.Section title="Copy">
        {p.email ? (
          <Action.CopyToClipboard title="Copy Email" content={p.email} shortcut={Keyboard.Shortcut.Common.Copy} />
        ) : null}
        {p.phone ? <Action.CopyToClipboard title="Copy Phone" content={p.phone} /> : null}
        <Action.CopyToClipboard
          title="Copy Name"
          content={displayName(p)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>
    </>
  );
}

export function PersonDetail({ personKey }: { personKey: string }) {
  const { data, isLoading } = usePromise(
    async (k: string) =>
      api<{ person: Person; last_message: LastMessage; dashboard_url: string }>(`/people/${encodeURIComponent(k)}`),
    [personKey],
    { onError: (e) => showError(e, "Could not load this person") },
  );
  const p = data?.person;
  const m = data?.last_message;
  const md = p
    ? [
        `# ${displayName(p)}`,
        p.title || p.company ? `${[p.title, p.company].filter(Boolean).join(", ")}` : "",
        "## Last message",
        m
          ? `**${m.from === "us" ? "You" : displayName(p)}** · ${m.channel} · ${when(m.at)}\n\n> ${m.text.replace(/\n/g, "\n> ")}`
          : "_No messages yet._",
        p.notes ? `## Notes\n\n${p.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      metadata={
        p ? (
          <Detail.Metadata>
            {p.email ? <Detail.Metadata.Label title="Email" text={p.email} /> : null}
            {p.phone ? <Detail.Metadata.Label title="Phone" text={p.phone} /> : null}
            {p.handle ? <Detail.Metadata.Label title="Handle" text={p.handle} /> : null}
            <Detail.Metadata.Label title="Connection" text={p.channel || "—"} />
            <Detail.Metadata.TagList title="Stage">
              <Detail.Metadata.TagList.Item text={p.stage} color={p.stage === "replied" ? Color.Green : Color.Blue} />
            </Detail.Metadata.TagList>
            {p.lead_score != null ? <Detail.Metadata.Label title="Lead score" text={String(p.lead_score)} /> : null}
            {p.website ? <Detail.Metadata.Link title="Website" target={p.website} text={p.website} /> : null}
            <Detail.Metadata.Label title="Last seen" text={when(p.last_seen) || "—"} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        p ? (
          <ActionPanel>
            <PersonActions p={p} dashboardUrl={data?.dashboard_url} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export default withConnection(FindPerson);
