import { useState } from "react";
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BacklinkListItem } from "./components/backlink-item";
import { batchBacklinks } from "./lib/batch";
import { handleApiError } from "./lib/errors";

const MAX_DOMAINS = 50;

export default function Command() {
  const { push } = useNavigation();
  const [domainsError, setDomainsError] = useState<string | undefined>();

  function handleSubmit(values: { domains: string }) {
    const domains = parseDomains(values.domains);
    if (domains.length === 0) {
      setDomainsError("Enter at least 1 domain");
      return false;
    }
    if (domains.length > MAX_DOMAINS) {
      setDomainsError(`Enter at most ${MAX_DOMAINS} domains (got ${domains.length})`);
      return false;
    }
    push(<ResultsList domains={domains} />);
    return true;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Look up Backlinks" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="domains"
        title="Domains"
        placeholder={"stripe.com\npaypal.com\nshopify.com"}
        info="One domain per line or comma-separated. Up to 50 domains. Costs 2 credits per successfully queried domain, charged after all lookups complete."
        error={domainsError}
        onChange={() => setDomainsError(undefined)}
      />
    </Form>
  );
}

function parseDomains(raw: string): string[] {
  const seen = new Set<string>();
  for (const d of raw.split(/[\n,]/)) {
    const trimmed = d.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

function ResultsList({ domains }: { domains: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = usePromise(async (d: string[]) => batchBacklinks(d), [domains], {
    onError: handleApiError,
  });

  const results = data?.data ?? [];
  const active = results.find((r) => r.domain === selected);

  if (selected && active) {
    return (
      <List navigationTitle={`Backlinks — ${active.domain}`}>
        {active.success && active.data && active.data.length > 0 ? (
          <List.Section title={active.domain} subtitle={`${active.total ?? active.data.length} results`}>
            {active.data.map((row, i) => (
              <BacklinkListItem key={`${row.from_url}-${i}`} itemKey={`${row.from_url}-${i}`} row={row} />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.XMarkCircle}
            title={active.success ? "No backlinks found" : "Lookup failed"}
            description={active.success ? undefined : active.error}
          />
        )}
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Batch Backlinks Lookup">
      <List.Section
        title="Domains"
        subtitle={data ? `${results.length} queried · ${data.credits_remaining} credits left` : undefined}
      >
        {results.map((r) => (
          <List.Item
            key={r.domain}
            icon={r.success ? Icon.CheckCircle : Icon.XMarkCircle}
            title={r.domain}
            subtitle={r.success ? undefined : r.error}
            accessories={r.success ? [{ text: `${r.total ?? r.data?.length ?? 0} backlinks` }] : []}
            actions={
              <ActionPanel>
                <Action title="View Backlinks" onAction={() => setSelected(r.domain)} />
                <Action.OpenInBrowser title="Open Domain" url={`https://${r.domain}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
