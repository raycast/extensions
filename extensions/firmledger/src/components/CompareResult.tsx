import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Args } from "../lib/core";
import { Obj, extractArray, json, pick, toMarkdown } from "../lib/format";
import { friendly, read, reportError } from "../lib/mcp";
import { fmtDate, page, table } from "../lib/theme";
import { FooterActions } from "./Footer";
import { ToolAction } from "./actions";

const ROWS: [string, (o: Obj) => string | undefined][] = [
  ["Type", (o) => pick(o, ["type", "entity_type"])],
  ["Category", (o) => pick(o, ["category"])],
  ["Location", (o) => [pick(o, ["city"]), pick(o, ["region"]), pick(o, ["country"])].filter(Boolean).join(", ") || pick(o, ["location"])],
  [
    "Ownership",
    (o) => (o.verified === true || o.is_verified === true || o.verified_at ? "Verified" : o.verified === false ? "Unverified" : undefined),
  ],
  ["Confidence", (o) => pick(o, ["confidence", "confidence_score"])],
  ["Health", (o) => pick(o, ["health", "health_score"])],
  ["Founded", (o) => pick(o, ["founded"])],
  ["Team size", (o) => pick(o, ["size"])],
  ["Website", (o) => pick(o, ["website", "domain"])],
  ["Last verified", (o) => fmtDate(o.verified_at ?? o.last_verified)],
];

/** Side-by-side comparison rendered as a clean table, like the site's compare page. */
export function CompareResult({ args }: { args: Args }) {
  const { data, isLoading, error, revalidate } = usePromise(read, ["compare_listings", args], { onError: reportError });
  const items = data ? extractArray(data.data, ["listings", "companies", "comparison", "items", "results"]) : [];
  const names = items.map((o, i) => pick(o, ["name", "title"]) ?? `Company ${i + 1}`);

  let md: string;
  if (error) {
    const f = friendly(error);
    md = page("Compare", "Compare Listings", undefined, `**${f.title}**\n\n${f.message}`);
  } else if (!data) {
    md = page("Compare", "Compare Listings", "Pulling the records side by side…", "");
  } else if (items.length < 2) {
    md = page("Compare", "Compare Listings", undefined, toMarkdown(data.data));
  } else {
    const rows = ROWS.map(([label, get]) => [label, ...items.map((o) => get(o) ?? "—")]).filter((r) => r.slice(1).some((c) => c !== "—"));
    const summary = pick(data.data as Obj, ["summary", "verdict", "note"]);
    md = page(
      "Compare",
      names.join("  vs  "),
      summary ?? data.summary,
      table(["", ...names], rows) +
        `\n\n${items
          .map((o, i) => (pick(o, ["tagline"]) ? `**${names[i]}** · ${pick(o, ["tagline"])}` : ""))
          .filter(Boolean)
          .join("\n\n")}`,
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Compare Listings"
      markdown={md}
      actions={
        <ActionPanel>
          <ToolAction
            tool="compare_listings"
            form
            defaults={{ listings: String(((args.listings as string[]) ?? []).join("\n")) }}
            title="Change Companies…"
            icon={Icon.Switch}
          />
          <Action.CopyToClipboard title="Copy JSON" content={json(data?.data ?? null)} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action title="Run Again" icon={Icon.ArrowClockwise} onAction={revalidate} shortcut={Keyboard.Shortcut.Common.Refresh} />
          <FooterActions />
        </ActionPanel>
      }
    />
  );
}
