import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { ListingActions } from "./actions";
import { ToolList } from "./ToolList";
import { pick } from "../lib/format";
import { BRAND, ring } from "../lib/theme";
import { ListingCard, confidenceOf } from "./Profile";
import { ToolAction } from "./actions";

const TYPES = ["", "company", "startup", "agency", "organization", "product", "service", "publisher"];

export function ListingSearch({ category, country, city }: { category?: string; country?: string; city?: string }) {
  const [type, setType] = useState("");
  const [verified, setVerified] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <ToolList
      tool="search_listings"
      args={{ category, country, city, type, verified_only: verified || undefined }}
      title={[category, country, city].filter(Boolean).join(" · ") || "Search Listings"}
      arrayKeys={["results", "listings", "items", "data"]}
      searchArg="query"
      searchPlaceholder="Search companies by name or keyword…"
      paged="offset"
      pageSize={20}
      sectionTitle={query ? "LEDGER · RESULTS" : "LEDGER · DIRECTORY"}
      itemTitle={(o) => pick(o, ["name", "title"])}
      itemIcon={(o) => (confidenceOf(o) !== undefined ? ring(confidenceOf(o)) : { source: Icon.Building, tintColor: BRAND.navy })}
      itemDetail={(o) => <ListingCard item={o} />}
      onQuery={setQuery}
      itemActions={(o) => <ListingActions item={o} />}
      listActions={() => (
        <>
          <ToolAction tool="prepare_listing_submission" form title="Add a New Listing…" icon={Icon.Plus} />
          <ToolAction tool="check_domain" form title="Check a Domain (Pro)…" icon={Icon.Globe} />
        </>
      )}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={`${type}|${verified ? 1 : 0}`}
          onChange={(v) => {
            const [t, ver] = v.split("|");
            setType(t);
            setVerified(ver === "1");
          }}
        >
          <List.Dropdown.Section title="Entity type">
            {TYPES.map((t) => (
              <List.Dropdown.Item key={t} value={`${t}|0`} title={t ? t[0].toUpperCase() + t.slice(1) : "All types"} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Verified only">
            {TYPES.map((t) => (
              <List.Dropdown.Item
                key={`v${t}`}
                value={`${t}|1`}
                title={`${t ? t[0].toUpperCase() + t.slice(1) : "All types"} · verified`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    />
  );
}
