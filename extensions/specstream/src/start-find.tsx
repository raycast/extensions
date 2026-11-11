import { Action, ActionPanel, Form, Icon, Keyboard, List, getPreferenceValues, useNavigation } from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createHash } from "node:crypto";
import { centsToUsd, specstreamRequest, type AcceptedRow, type FindSnap, type ParseResult, type RowsPage } from "./api";

type Quote = {
  quote_id: string;
  quote_hash: string;
  maximum_cents: number;
  currency?: string;
  expires_at: string;
  terms?: Record<string, unknown> | null;
  scope?: Record<string, unknown> | null;
  existing_execution?: { find_id?: string | null } | null;
};
type Execution = { find_id?: string | null; state?: string };
type Saved = { q: string; canonical: string; quote: Quote; requestKey: string; attempted: boolean; findId?: string };
const TERMINAL = new Set(["completed", "partial", "failed", "canceled", "expired"]);
const money = (cents: number, currency?: string) => `${currency === "EUR" ? "€" : "$"}${centsToUsd(cents).toFixed(2)}`;
const count = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null);
const pause = () => new Promise((resolve) => setTimeout(resolve, 1000));
function priceText(quote: Quote) {
  const most = money(quote.maximum_cents, quote.currency);
  const units = count(quote.terms?.maximum_units) ?? count(quote.scope?.requested_units);
  const minimum = count(quote.terms?.minimum_units);
  const head = units ? `Up to ${units} results, at most ${most}.` : `At most ${most}.`;
  if (!minimum) return head;
  return minimum > 1
    ? `${head} If fewer than ${minimum} match, nothing is charged.`
    : `${head} If nothing matches, nothing is charged.`;
}
async function waitForFind(origin: string, apiKey: string, id: string): Promise<FindSnap> {
  for (let index = 0; index < 60; index++) {
    const result = await specstreamRequest<FindSnap>(origin, apiKey, "GET", `/v1/finds/${encodeURIComponent(id)}`);
    if (TERMINAL.has(result.status)) return result;
    await pause();
  }
  throw new Error("The request is still running. Reopen this command to pick it up. Nothing new is started.");
}
async function waitForFindId(origin: string, apiKey: string, requestKey: string): Promise<string | null> {
  for (let index = 0; index < 30; index++) {
    const result = await specstreamRequest<Execution>(
      origin,
      apiKey,
      "GET",
      `/v1/capacity/requests/${encodeURIComponent(requestKey)}`,
    );
    if (result.find_id) return result.find_id;
    if (result.state === "released") return null;
    await pause();
  }
  throw new Error("The request is still starting. Reopen this command to pick it up. Nothing new is started.");
}
async function allRows(origin: string, apiKey: string, findId: string): Promise<RowsPage> {
  const path = `/v1/finds/${encodeURIComponent(findId)}/rows?limit=100`;
  let page = await specstreamRequest<RowsPage>(origin, apiKey, "GET", path);
  const rows = [...page.rows];
  const seen = new Set<string>();
  while (page.next_cursor && !seen.has(page.next_cursor)) {
    seen.add(page.next_cursor);
    page = await specstreamRequest<RowsPage>(
      origin,
      apiKey,
      "GET",
      `${path}&cursor=${encodeURIComponent(page.next_cursor)}`,
    );
    rows.push(...page.rows);
  }
  return { ...page, rows, next_cursor: null };
}
function rowText(row: AcceptedRow) {
  return row.cells
    .filter((cell) => cell.display)
    .map((cell) => (cell.label ? `${cell.label}: ${cell.display}` : String(cell.display)))
    .join("\n");
}
function sources(row: AcceptedRow) {
  const links = new Map<string, string>();
  for (const cell of row.cells) {
    const url = cell.provenance?.source_url;
    if (url && /^https?:\/\//i.test(url) && !links.has(url)) links.set(url, cell.label || cell.column_id);
  }
  return [...links].map(([url, label]) => ({ url, label }));
}
function Results({
  rows,
  findId,
  onStartAnother,
}: {
  rows: RowsPage;
  findId?: string;
  onStartAnother: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const listActions = (
    <ActionPanel.Section>
      {findId ? (
        <Action.OpenInBrowser
          title="Open in SpecStream"
          icon={Icon.Globe}
          url={`https://specstream.ai/find/${encodeURIComponent(findId)}`}
        />
      ) : null}
      <Action
        title="Start Another Request"
        icon={Icon.Plus}
        onAction={async () => {
          await onStartAnother();
          pop();
        }}
      />
    </ActionPanel.Section>
  );
  return (
    <List
      navigationTitle="Results"
      searchBarPlaceholder="Search results"
      actions={<ActionPanel>{listActions}</ActionPanel>}
    >
      <List.EmptyView
        title={rows.rows.length === 0 ? "No results" : "No matching results"}
        description={
          rows.rows.length === 0
            ? "Nothing met the request, so nothing was charged."
            : "Try a different search to find your results."
        }
      />
      {rows.rows.map((row) => {
        const links = sources(row);
        return (
          <List.Item
            key={row.entity_id}
            title={row.cells[0]?.display || row.entity_id}
            subtitle={row.cells
              .slice(1, 4)
              .map((cell) => cell.display)
              .filter(Boolean)
              .join(" · ")}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Result" content={rowText(row) || row.entity_id} />
                  {links[0] ? (
                    <Action.OpenInBrowser
                      title="Open Source"
                      url={links[0].url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  ) : null}
                  {links.length > 1 ? (
                    <ActionPanel.Submenu title="Open Source of a Value" icon={Icon.Link}>
                      {links.map((link) => (
                        <Action.OpenInBrowser key={link.url} title={link.label} url={link.url} />
                      ))}
                    </ActionPanel.Submenu>
                  ) : null}
                </ActionPanel.Section>
                {listActions}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
export default function StartFind() {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const storageKey =
    "specstream-request:" +
    createHash("sha256")
      .update(prefs.apiOrigin + ":" + prefs.apiKey)
      .digest("hex");
  const {
    value: saved,
    setValue: setSaved,
    removeValue: removeSaved,
    isLoading: restoring,
  } = useLocalStorage<Saved>(storageKey);
  const [q, setQ] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restoring || restored) return;
    setRestored(true);
    if (saved?.quote?.quote_id) setQ((typed) => typed || saved.q);
  }, [restoring, restored, saved]);
  const call = <T,>(method: string, path: string, body?: unknown) =>
    specstreamRequest<T>(prefs.apiOrigin, prefs.apiKey, method, path, body);
  async function persist(value: Saved) {
    await setSaved(value);
  }
  async function startAnother() {
    await removeSaved();
    setQ("");
    setConfirm("");
  }
  async function act(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      await showFailureToast(error, { title: "SpecStream did not confirm that" });
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    if (saved?.attempted) throw new Error("Finish or reopen the earlier request before starting another.");
    const parsed = await call<ParseResult & { ast: { limit: { max: number } } }>("POST", "/v1/parse", { q });
    if (parsed.status !== "runnable" || !parsed.ast_hash || !parsed.ast)
      throw new Error("SpecStream could not read that as a complete request. Refine it in the workspace first.");
    const quote = await call<Quote>("POST", "/v1/capacity/quotes", {
      ast_hash: parsed.ast_hash,
      operation: "find",
      requested_units: parsed.ast.limit.max,
    });
    await persist({
      q,
      canonical: parsed.canonical_sentence || q,
      quote,
      requestKey: "raycast:" + quote.quote_id,
      attempted: false,
    });
    setConfirm("");
  }
  async function execute() {
    if (!saved || saved.q !== q) throw new Error("Check the current request first.");
    let current = saved;
    if (!current.findId) {
      const quote = await call<Quote>("GET", `/v1/capacity/quotes/${encodeURIComponent(current.quote.quote_id)}`);
      if (quote.existing_execution?.find_id) current = { ...current, findId: quote.existing_execution.find_id };
      else {
        if (
          !current.attempted &&
          (!/^\d+(\.\d{1,2})?$/.test(confirm) || Math.round(Number(confirm) * 100) !== quote.maximum_cents)
        )
          throw new Error("Type the exact maximum shown to approve this work.");
        if (quote.quote_hash !== current.quote.quote_hash)
          throw new Error("The price changed. Check the request again.");
        current = { ...current, attempted: true };
        await persist(current);
        let findId: string | null | undefined;
        try {
          const result = await call<Execution>("POST", "/v1/capacity/executions", {
            quote_id: quote.quote_id,
            quote_hash: quote.quote_hash,
            confirm_max_cents: quote.maximum_cents,
            idempotency_key: current.requestKey,
          });
          findId = result.find_id;
        } catch (error) {
          const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
          if (status >= 400 && status < 500) await persist({ ...current, attempted: false });
          throw error;
        }
        // The 202 can arrive before the run has its find. The request ID shows it once it does.
        if (!findId) findId = await waitForFindId(prefs.apiOrigin, prefs.apiKey, current.requestKey);
        if (!findId) {
          await persist({ ...current, attempted: false });
          throw new Error("The request did not start, so nothing was charged.");
        }
        current = { ...current, findId };
      }
      await persist(current);
    }
    const status = await waitForFind(prefs.apiOrigin, prefs.apiKey, current.findId!);
    if (!["completed", "partial"].includes(status.status)) {
      await persist({ ...current, attempted: false });
      throw new Error(`The request ended as ${status.status}. Your earlier results are still available.`);
    }
    const page = await allRows(prefs.apiOrigin, prefs.apiKey, current.findId!);
    push(<Results rows={page} findId={current.findId} onStartAnother={startAnother} />);
  }
  return (
    <Form
      isLoading={busy || restoring}
      actions={
        <ActionPanel>
          {!saved?.attempted ? <Action.SubmitForm title="Check My Request" onSubmit={() => act(review)} /> : null}
          {saved ? (
            <Action title={saved.attempted ? "Reopen This Request" : "Approve and Run"} onAction={() => act(execute)} />
          ) : null}
          {saved ? (
            <Action.OpenInBrowser
              title="Review in SpecStream or Add Balance"
              url={`https://specstream.ai/work?capacity_quote=${encodeURIComponent(saved.quote.quote_id)}`}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="q"
        title="What Do You Need?"
        placeholder="Rust command-line tools on GitHub with more than 1,000 stars, pushed to in the last month, under an MIT or Apache license."
        value={q}
        onChange={(value) => {
          if (!saved?.attempted) setQ(value);
        }}
      />
      {saved ? (
        <>
          <Form.Description title="How SpecStream Read It" text={saved.canonical} />
          <Form.Description title="Price" text={priceText(saved.quote)} />
        </>
      ) : null}
      <Form.TextField
        id="approve_max"
        title="Maximum to Approve"
        placeholder="Type the exact maximum shown above"
        value={confirm}
        onChange={setConfirm}
        info="Approval uses your SpecStream balance. There is no automatic checkout and no overage."
      />
    </Form>
  );
}
