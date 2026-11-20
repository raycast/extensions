import { Icon, List } from "@raycast/api";
import { ListingActions, ToolAction } from "./components/actions";
import { ToolList } from "./components/ToolList";
import { listingRef, pick } from "./lib/format";
import { BRAND, ring } from "./lib/theme";
import { ListingCard, confidenceOf } from "./components/Profile";

export default function Command() {
  return (
    <ToolList
      tool="get_watchlist"
      arrayKeys={["watchlist", "companies", "items", "listings"]}
      label="Watchlist"
      searchPlaceholder="Filter your watched companies…"
      itemTitle={(o) => pick(o, ["name", "title"])}
      itemSubtitle={(o) => pick(o, ["website", "domain"])}
      itemIcon={(o) => (confidenceOf(o) !== undefined ? ring(confidenceOf(o)) : { source: Icon.Building, tintColor: BRAND.navy })}
      itemDetail={(o) => <ListingCard item={o} />}
      accessories={(o) => {
        const a: List.Item.Accessory[] = [];
        if (pick(o, ["category"])) a.push({ text: pick(o, ["category"]) });
        const v = o.verified === true || o.is_verified === true || Boolean(o.verified_at);
        a.push(v ? { tag: { value: "Verified", color: BRAND.green } } : { tag: { value: "Unverified", color: BRAND.amber } });
        return a;
      }}
      emptyTitle="Your watchlist is empty"
      itemActions={(o) => {
        const ref = listingRef(o);
        return (
          <>
            <ListingActions item={o} />
            {ref && <ToolAction tool="watchlist_remove" preset={{ listing: ref }} title="Remove from Watchlist" icon={Icon.StarDisabled} />}
          </>
        );
      }}
      listActions={() => (
        <>
          <ToolAction tool="watchlist_add" form title="Add Company to Watchlist…" icon={Icon.Plus} />
          <ToolAction tool="export_watchlist_csv" title="Export Watchlist as CSV" icon={Icon.Download} />
        </>
      )}
    />
  );
}
