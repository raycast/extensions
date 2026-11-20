import { Action, ActionPanel, Icon, Keyboard, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Args } from "../lib/core";
import { Obj, extractArray, json, listingRef, pick } from "../lib/format";
import { friendly, reportError, run } from "../lib/mcp";
import { BRAND, LINKS, page, ring, table } from "../lib/theme";
import { FooterActions } from "./Footer";
import { ListingActions, ToolAction } from "./actions";
import { ListingCard, confidenceOf, looksLikeProfile, profileOf } from "./Profile";

const KEYS = ["listings", "records", "matches", "results", "items", "companies"];

/** Every record the server returned for the domain, whatever the payload shape. */
function recordsOf(data: unknown): Obj[] {
  const fromArray = extractArray(data, KEYS).filter((o) => looksLikeProfile(o));
  if (fromArray.length) return fromArray;
  const o = (data ?? {}) as Obj;
  for (const k of ["listing", "match", "record", "company"]) {
    if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) return [o[k]];
  }
  const self = profileOf(o);
  return looksLikeProfile(self) ? [self as Obj] : [];
}

const isVerified = (o: Obj) => o.verified === true || o.is_verified === true || Boolean(o.verified_at);

/** Domain check: a summary row plus one row per FirmLedger record that uses the domain. */
export function DomainResult({ args }: { args: Args }) {
  const domain = String(args.domain ?? "").trim();
  const { data, isLoading, error, revalidate } = usePromise(run, ["check_domain", args], { onError: reportError });
  const records = data ? recordsOf(data.data) : [];
  const verifiedCount = records.filter(isVerified).length;
  const f = error ? friendly(error) : undefined;

  const summary = page(
    "Domain check",
    domain || "Check Domain",
    records.length
      ? `${records.length} approved ${records.length === 1 ? "record uses" : "records use"} this domain.`
      : "No approved FirmLedger record uses this domain.",
    table(
      ["Field", "Value"],
      [
        ["Domain", domain || "—"],
        ["Records found", String(records.length)],
        ["Ownership verified", records.length ? `${verifiedCount} of ${records.length}` : "—"],
        ["Result", records.length ? "Listed" : "Not listed"],
      ],
    ) +
      (records.length
        ? ""
        : "\n\nNot being listed is not a verdict on the business. It only means FirmLedger holds no verified record for it."),
  );

  const common = (
    <>
      <Action.CopyToClipboard title="Copy JSON" content={json(data?.data ?? null)} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={revalidate} shortcut={Keyboard.Shortcut.Common.Refresh} />
      <ToolAction tool="check_domain" form title="Check Another Domain…" icon={Icon.Globe} />
      <Action.OpenInBrowser title="Pricing & Pro" url={LINKS.pricing} icon={Icon.CreditCard} />
      <FooterActions />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!error && Boolean(data)}
      navigationTitle={`Check Domain · ${domain}`}
      searchBarPlaceholder="Filter records…"
    >
      {f ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={f.title}
          description={f.message}
          actions={
            <ActionPanel>
              {f.url && <Action title="Open Link" icon={Icon.Link} onAction={() => open(f.url!)} />}
              {common}
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="LEDGER · DOMAIN CHECK">
            <List.Item
              title={domain || "Domain"}
              subtitle={records.length ? `${records.length} ${records.length === 1 ? "record" : "records"}` : "Not listed"}
              icon={{ source: Icon.Globe, tintColor: records.length ? BRAND.green : BRAND.amber }}
              detail={<List.Item.Detail markdown={summary} />}
              actions={
                <ActionPanel>
                  {!records.length && !isLoading && (
                    <ToolAction
                      tool="prepare_listing_submission"
                      form
                      defaults={{ website: domain }}
                      title="Add This Business to FirmLedger…"
                      icon={Icon.Plus}
                    />
                  )}
                  {common}
                </ActionPanel>
              }
            />
          </List.Section>
          {records.length > 0 && (
            <List.Section title="LEDGER · RECORDS" subtitle={String(records.length)}>
              {records.map((o, i) => {
                const c = confidenceOf(o);
                const accessories: List.Item.Accessory[] = [];
                if (pick(o, ["category"])) accessories.push({ text: pick(o, ["category"]) });
                accessories.push(
                  isVerified(o) ? { tag: { value: "Verified", color: BRAND.green } } : { tag: { value: "Unverified", color: BRAND.amber } },
                );
                return (
                  <List.Item
                    key={`${listingRef(o) ?? i}-${i}`}
                    title={pick(o, ["name"]) ?? `Record ${i + 1}`}
                    subtitle={pick(o, ["website", "domain"])}
                    icon={c !== undefined ? ring(c) : { source: Icon.Building, tintColor: BRAND.navy }}
                    accessories={accessories}
                    detail={<ListingCard item={o} />}
                    actions={
                      <ActionPanel>
                        <ListingActions item={o} />
                        {common}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
