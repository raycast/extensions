import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { SITE, WhereResult } from "./api";

const GROUPS: { key: keyof WhereResult["providers"]; title: string }[] = [
  { key: "flatrate", title: "Subscription" },
  { key: "free", title: "Free" },
  { key: "ads", title: "Free with ads" },
  { key: "rent", title: "Rent" },
  { key: "buy", title: "Buy" },
];

function Results({ r }: { r: WhereResult }) {
  const names = GROUPS.flatMap((g) =>
    r.providers[g.key].map((p) => p.name),
  ).join(", ");
  return (
    <List
      navigationTitle={`${r.title}${r.year ? ` (${r.year})` : ""} — ${r.region}`}
    >
      {GROUPS.map((g) => (
        <List.Section
          key={g.key}
          title={g.title}
          subtitle={String(r.providers[g.key].length)}
        >
          {r.providers[g.key].map((p) => (
            <List.Item
              key={`${g.key}-${p.id}`}
              icon={Icon.Play}
              title={p.name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={r.url} />
                  <Action.CopyToClipboard
                    title="Copy Providers"
                    content={names}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {GROUPS.every((g) => r.providers[g.key].length === 0) && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`No US providers found for ${r.title}`}
        />
      )}
    </List>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [busy, setBusy] = useState(false);
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Find Providers"
            onSubmit={async (values: {
              title: string;
              year: string;
              type: string;
              region: string;
            }) => {
              if (!values.title.trim()) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a title",
                });
                return;
              }
              setBusy(true);
              try {
                const params = new URLSearchParams({
                  title: values.title.trim(),
                });
                if (values.year.trim()) params.set("year", values.year.trim());
                if (values.type) params.set("type", values.type);
                if (values.region.trim())
                  params.set("region", values.region.trim().toUpperCase());
                const res = await fetch(`${SITE}/api/ext/where?${params}`);
                if (!res.ok) {
                  const msg =
                    res.status === 404
                      ? "Title not found"
                      : `API error ${res.status}`;
                  await showToast({ style: Toast.Style.Failure, title: msg });
                  return;
                }
                push(<Results r={(await res.json()) as WhereResult} />);
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Request failed",
                });
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Fight Club"
        autoFocus
      />
      <Form.TextField id="year" title="Year (optional)" placeholder="1999" />
      <Form.Dropdown id="type" title="Type" defaultValue="">
        <Form.Dropdown.Item title="Any" value="" />
        <Form.Dropdown.Item title="Movie" value="movie" />
        <Form.Dropdown.Item title="TV Show" value="tv" />
      </Form.Dropdown>
      <Form.TextField id="region" title="Region" defaultValue="US" />
    </Form>
  );
}
