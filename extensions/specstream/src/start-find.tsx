import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createHash } from "node:crypto";
import { centsToUsd, specstreamRequest, type FindSnap, type ParseResult, type RowsPage } from "./api";

type Quote = {
  quote_id: string;
  quote_hash: string;
  maximum_cents: number;
  currency?: string;
  expires_at: string;
  terms: { minimum_units: number; maximum_units: number };
  existing_execution?: { find_id?: string } | null;
};
type Saved = { q: string; canonical: string; quote: Quote; requestKey: string; attempted: boolean; findId?: string };
type Prefs = { apiOrigin: string; apiKey: string };
const TERMINAL = new Set(["completed", "partial", "failed", "canceled", "expired"]);
const money = (cents: number, currency?: string) => `${currency === "EUR" ? "€" : "$"}${centsToUsd(cents).toFixed(2)}`;
async function waitForFind(origin: string, apiKey: string, id: string): Promise<FindSnap> {
  for (let index = 0; index < 60; index++) {
    const result = await specstreamRequest<FindSnap>(origin, apiKey, "GET", `/v1/finds/${encodeURIComponent(id)}`);
    if (TERMINAL.has(result.status)) return result;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("The request is still running. Reopen this command to pick it up. Nothing new is started.");
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
  return (
    <List
      navigationTitle="Results"
      searchBarPlaceholder="Search results"
      actions={
        <ActionPanel>
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
        </ActionPanel>
      }
    >
      <List.EmptyView title="No results" description="Nothing met the request, so nothing was charged." />
      {rows.rows.map((row) => (
        <List.Item
          key={row.entity_id}
          title={row.cells[0]?.display || row.entity_id}
          subtitle={row.cells
            .slice(1, 4)
            .map((cell) => cell.display)
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
    </List>
  );
}
export default function StartFind() {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Prefs>();
  const storageKey =
    "specstream-request:" +
    createHash("sha256")
      .update(prefs.apiOrigin + ":" + prefs.apiKey)
      .digest("hex");
  const [q, setQ] = useState(""),
    [saved, setSaved] = useState<Saved | null>(null);
  const [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void LocalStorage.getItem<string>(storageKey)
      .then((raw) => {
        if (!raw) return;
        const value = JSON.parse(raw) as Saved;
        if (value.quote?.quote_id) {
          setSaved(value);
          setQ(value.q);
        }
      })
      .catch(() => showToast({ style: Toast.Style.Failure, title: "Your earlier request could not be restored" }));
  }, [storageKey]);
  const call = <T,>(method: string, path: string, body?: unknown) =>
    specstreamRequest<T>(prefs.apiOrigin, prefs.apiKey, method, path, body);
  async function persist(value: Saved) {
    await LocalStorage.setItem(storageKey, JSON.stringify(value));
    setSaved(value);
  }
  async function startAnother() {
    await LocalStorage.removeItem(storageKey);
    setSaved(null);
    setQ("");
    setConfirm("");
  }
  async function act(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "SpecStream did not confirm that", message: String(error) });
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
        try {
          const result = await call<{ find_id: string }>("POST", "/v1/capacity/executions", {
            quote_id: quote.quote_id,
            quote_hash: quote.quote_hash,
            confirm_max_cents: quote.maximum_cents,
            idempotency_key: current.requestKey,
          });
          current = { ...current, findId: result.find_id };
        } catch (error) {
          const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
          if (status >= 400 && status < 500) await persist({ ...current, attempted: false });
          throw error;
        }
      }
      await persist(current);
    }
    const status = await waitForFind(prefs.apiOrigin, prefs.apiKey, current.findId!);
    if (!["completed", "partial"].includes(status.status)) {
      await persist({ ...current, attempted: false });
      throw new Error(`The request ended as ${status.status}. Your earlier results are still available.`);
    }
    const page = await call<RowsPage>("GET", `/v1/finds/${encodeURIComponent(current.findId!)}/rows`);
    push(<Results rows={page} findId={current.findId} onStartAnother={startAnother} />);
  }
  return (
    <Form
      isLoading={busy}
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
          <Form.Description
            title="Price"
            text={`Up to ${saved.quote.terms.maximum_units} results, at most ${money(saved.quote.maximum_cents, saved.quote.currency)}. If fewer than ${saved.quote.terms.minimum_units} match, nothing is charged.`}
          />
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
