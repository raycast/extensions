import { ActionPanel, Icon, List } from "@raycast/api";
import { ListingActions, ToolAction } from "./components/actions";
import { ToolList } from "./components/ToolList";
import { RecordCard } from "./components/RecordCard";
import { BRAND, ring } from "./lib/theme";
import { confidenceOf } from "./components/Profile";
import { statusColor } from "./lib/render";
import { Obj, listingRef, pick } from "./lib/format";

const EDITABLE = [
  "name",
  "tagline",
  "description",
  "website",
  "email",
  "phone",
  "country",
  "city",
  "region",
  "address",
  "logo_url",
  "founded",
  "size",
  "tags",
];

function Actions({ o }: { o: Obj }) {
  const ref = listingRef(o);
  if (!ref) return null;
  const defaults: Record<string, string> = {};
  for (const k of EDITABLE) if (typeof o[k] === "string") defaults[k] = o[k];
  return (
    <>
      <ActionPanel.Section title="Insights">
        <ToolAction tool="get_analytics" preset={{ listing: ref }} title="Audience Analytics" icon={Icon.BarChart} />
        <ToolAction tool="list_leads" preset={{ listing: ref }} title="Leads for This Listing" icon={Icon.Envelope} />
        <ToolAction tool="get_my_revenue" preset={{ listing: ref }} title="Revenue Records" icon={Icon.Coins} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Edit & refresh">
        <ToolAction tool="update_my_listing" preset={{ listing: ref }} defaults={defaults} form title="Edit Listing…" icon={Icon.Pencil} />
        <ToolAction tool="refresh_listing_scores" preset={{ listing: ref }} title="Refresh Scores" icon={Icon.ArrowClockwise} />
        <ToolAction tool="refresh_listing_tech" preset={{ listing: ref }} title="Refresh Tech Snapshot" icon={Icon.Cog} />
        <ToolAction tool="refresh_listing_news" preset={{ listing: ref }} title="Refresh News" icon={Icon.Megaphone} />
        <ToolAction tool="manage_my_revenue" preset={{ listing: ref }} form title="Submit Revenue Change…" icon={Icon.Coins} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Grow">
        <ToolAction tool="post_job" preset={{ listing: ref }} form title="Post a Job…" icon={Icon.Building} />
        <ToolAction tool="prepare_advertising" preset={{ listing: ref }} form title="Advertise (Checkout Link)…" icon={Icon.Rocket} />
        <ToolAction tool="prepare_listing_claim" preset={{ listing: ref }} form title="Claim / Verify Ownership…" icon={Icon.Key} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger zone">
        <ToolAction tool="request_listing_removal" preset={{ listing: ref }} form title="Request Removal…" icon={Icon.Trash} />
      </ActionPanel.Section>
      <ListingActions item={o} />
    </>
  );
}

export default function Command() {
  return (
    <ToolList
      tool="get_my_listings"
      arrayKeys={["listings", "items", "results"]}
      label="My listings"
      searchPlaceholder="Filter your listings…"
      itemTitle={(o) => pick(o, ["name", "title"])}
      itemSubtitle={(o) => pick(o, ["website", "category"])}
      itemIcon={(o) => (confidenceOf(o) !== undefined ? ring(confidenceOf(o)) : { source: Icon.Building, tintColor: BRAND.navy })}
      itemDetail={(o) => <RecordCard item={o} label="My listing" />}
      itemActions={(o) => <Actions o={o} />}
      accessories={(o) => {
        const a: List.Item.Accessory[] = [];
        const st = pick(o, ["status", "moderation_status"]);
        if (st) a.push({ tag: { value: st, color: statusColor(st) } });
        const nl = pick(o, ["new_leads", "leads_new"]);
        if (nl) a.push({ icon: Icon.Envelope, text: nl });
        return a;
      }}
      emptyTitle="No listings yet"
      listActions={() => <ToolAction tool="prepare_listing_submission" form title="Add a New Listing…" icon={Icon.Plus} />}
    />
  );
}
