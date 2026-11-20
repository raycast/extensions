// Catalog of all 51 FirmLedger MCP tools (from the official MCP reference).
import type { Args } from "./core";

export type Group = "open" | "pro" | "account_read" | "account_write";
export type ArgType = "string" | "text" | "int" | "bool" | "enum" | "list" | "json";

export interface Arg {
  name: string;
  type: ArgType;
  req?: boolean;
  opts?: string[];
  desc?: string;
}

export interface ToolDef {
  name: string;
  group: Group;
  title: string;
  desc: string;
  args: Arg[];
  destructive?: boolean;
}

const s = (name: string, desc?: string, req = false): Arg => ({ name, type: "string", desc, req });
const t = (name: string, desc?: string, req = false): Arg => ({ name, type: "text", desc, req });
const n = (name: string, desc?: string, req = false): Arg => ({ name, type: "int", desc, req });
const b = (name: string, desc?: string): Arg => ({ name, type: "bool", desc });
const e = (name: string, opts: string[], req = false, desc?: string): Arg => ({ name, type: "enum", opts, req, desc });
const l = (name: string, desc?: string, req = false): Arg => ({ name, type: "list", desc, req });
const j = (name: string, desc?: string): Arg => ({ name, type: "json", desc });

const LISTING = (desc = "Slug (best), exact name, FirmLedger ID (FL-00012) or profile URL") => s("listing", desc, true);
const OWN = () => s("listing", "One of your own listings (slug, name or FL-ID)", true);
const LEAD_STATUS = ["new", "contacted", "qualified", "won", "lost"];
const ROLE = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];

/** Friendlier field titles for the forms (falls back to a humanised argument name). */
export const FIELD_LABELS: Record<string, string> = {
  domain: "Website domain",
  listings: "Companies",
  listing: "Company",
  verified_only: "Verified only",
};

export const TOOLS: ToolDef[] = [
  // ───────── Open (15) ─────────
  {
    name: "search_listings",
    group: "open",
    title: "Search Listings",
    desc: "Search approved company records by name/keyword, category, country, city, type.",
    args: [
      s("query", "Company name or keyword"),
      s("category", "e.g. Fintech"),
      s("country", "e.g. Kenya"),
      s("city", "e.g. Nairobi"),
      e("type", ["company", "startup", "agency", "organization", "product", "service", "publisher"]),
      b("verified_only", "Only ownership-verified"),
      n("limit", "1-25"),
      n("offset", "Results to skip"),
    ],
  },
  {
    name: "get_listing",
    group: "open",
    title: "Get Listing Profile",
    desc: "Full public profile of one company (Pro adds contact details, people, tech).",
    args: [LISTING()],
  },
  { name: "list_categories", group: "open", title: "List Categories", desc: "Every category with its approved listing count.", args: [] },
  { name: "list_countries", group: "open", title: "List Countries", desc: "Countries in the directory with listing counts.", args: [] },
  {
    name: "prepare_listing_submission",
    group: "open",
    title: "Prepare Listing Submission",
    desc: "Pre-filled link to the real submission form. Creates nothing.",
    args: [s("name", "Company name", true), s("website", "e.g. example.co.ke"), s("category"), s("country"), s("city")],
  },
  {
    name: "compare_listings",
    group: "open",
    title: "Compare Listings",
    desc: "Compare 2-4 companies side by side.",
    args: [l("listings", "2 to 4 companies, one per line (slugs best)", true)],
  },
  { name: "list_plans", group: "open", title: "List Pro Plans", desc: "Current FirmLedger Pro plans and prices.", args: [] },
  {
    name: "list_ad_packages",
    group: "open",
    title: "List Ad Packages",
    desc: "Sponsored-placement packages and your advertisable listings.",
    args: [],
  },
  {
    name: "prepare_upgrade",
    group: "open",
    title: "Prepare Pro Checkout Link",
    desc: "Personal checkout link for a Pro plan. Charges nothing.",
    args: [s("plan", "Plan id or exact name from list_plans"), s("promo_code")],
  },
  {
    name: "prepare_advertising",
    group: "open",
    title: "Prepare Advertising Checkout",
    desc: "Checkout link for a Sponsored package. Charges nothing.",
    args: [OWN(), s("package", "Package id or exact name from list_ad_packages", true)],
  },
  {
    name: "prepare_listing_claim",
    group: "open",
    title: "Prepare Listing Claim",
    desc: "Link to claim a listing via DNS TXT, meta tag or badge.",
    args: [LISTING(), e("method", ["dns", "meta", "badge"])],
  },
  {
    name: "connection_status",
    group: "open",
    title: "Connection Status",
    desc: "Free/Pro, trial and what this connection can do.",
    args: [],
  },
  {
    name: "get_connection_status",
    group: "open",
    title: "Get Connection Status",
    desc: "How this assistant is connected (public / key / sign-in) and token expiry.",
    args: [],
  },
  {
    name: "request_authentication",
    group: "open",
    title: "Request Authentication",
    desc: "Connect, re-authenticate or refresh the sign-in (OAuth).",
    args: [e("mode", ["connect", "reauthenticate", "refresh"])],
  },
  {
    name: "revoke_connection",
    group: "open",
    title: "Revoke Connection",
    desc: "Disconnect this assistant on FirmLedger's side.",
    args: [],
    destructive: true,
  },

  // ───────── Pro directory (4) ─────────
  {
    name: "get_relationships",
    group: "pro",
    title: "Get Relationships",
    desc: "Founders, investors, parents, subsidiaries, products, partners.",
    args: [LISTING()],
  },
  {
    name: "get_news",
    group: "pro",
    title: "Get Company News",
    desc: "Recent moderated news headlines for a company.",
    args: [LISTING(), n("limit", "1-12")],
  },
  {
    name: "list_jobs",
    group: "pro",
    title: "List Open Jobs",
    desc: "Open roles at approved companies.",
    args: [s("company"), s("location", "e.g. Nairobi, Kenya, Remote"), s("query", "Keyword"), n("limit", "1-25"), n("offset")],
  },
  {
    name: "check_domain",
    group: "pro",
    title: "Check Domain",
    desc: "Is a website domain used by an approved FirmLedger record?",
    args: [s("domain", "example.co.ke or a full URL", true)],
  },

  // ───────── Account reads (12) ─────────
  {
    name: "get_my_listings",
    group: "account_read",
    title: "My Listings",
    desc: "Listings you own or submitted, with status, scores, leads.",
    args: [],
  },
  {
    name: "get_analytics",
    group: "account_read",
    title: "Audience Analytics",
    desc: "Views, clicks, leads and funnel for your listings.",
    args: [s("listing", "Optional: one of your listings")],
  },
  {
    name: "list_leads",
    group: "account_read",
    title: "List Leads",
    desc: "Your Leads inbox.",
    args: [e("box", ["received", "archived", "sent"]), e("status", LEAD_STATUS), s("listing"), n("limit", "1-50"), n("page")],
  },
  {
    name: "get_lead",
    group: "account_read",
    title: "Get Lead Conversation",
    desc: "One conversation with all messages.",
    args: [n("lead_id", "lead_id from list_leads", true)],
  },
  { name: "get_watchlist", group: "account_read", title: "My Watchlist", desc: "Companies you watch.", args: [] },
  { name: "export_watchlist_csv", group: "account_read", title: "Export Watchlist CSV", desc: "Watchlist as CSV text.", args: [] },
  {
    name: "get_notifications",
    group: "account_read",
    title: "My Notifications",
    desc: "In-app notifications, newest first.",
    args: [b("unread_only"), n("limit", "1-60")],
  },
  {
    name: "list_my_tickets",
    group: "account_read",
    title: "My Support Tickets",
    desc: "Support tickets; pass a reference for the full thread.",
    args: [s("ticket", "e.g. TK-1A2B3C")],
  },
  {
    name: "get_api_status",
    group: "account_read",
    title: "REST API v1 Status",
    desc: "Plan, scopes, budgets, usage for this key.",
    args: [s("key_prefix")],
  },
  {
    name: "list_webhooks",
    group: "account_read",
    title: "List Webhooks",
    desc: "Webhook destinations (and deliveries for one).",
    args: [n("webhook_id"), n("limit", "1-25")],
  },
  { name: "list_api_keys", group: "account_read", title: "List API Keys", desc: "Your API keys (never the raw key).", args: [] },
  {
    name: "get_my_revenue",
    group: "account_read",
    title: "My Revenue Records",
    desc: "Published and pending revenue records for a listing you own.",
    args: [LISTING()],
  },

  // ───────── Account changes (20) — all use the confirm handshake ─────────
  {
    name: "start_lead",
    group: "account_write",
    title: "Contact a Business (Start Lead)",
    desc: "Start a Leads conversation with a claimed business.",
    args: [
      LISTING(),
      s("name", "Your name (optional)"),
      s("phone"),
      s("looking_for", "Short subject (≤140 chars)"),
      t("message", "Your message", true),
    ],
  },
  {
    name: "reply_to_lead",
    group: "account_write",
    title: "Reply to Lead",
    desc: "Send a reply in one of your lead conversations.",
    args: [n("lead_id", undefined, true), t("message", "Reply text", true)],
  },
  {
    name: "set_lead_status",
    group: "account_write",
    title: "Set Lead Status",
    desc: "Move a lead to a new status.",
    args: [n("lead_id", undefined, true), e("status", LEAD_STATUS, true)],
  },
  { name: "watchlist_add", group: "account_write", title: "Add to Watchlist", desc: "Watch a company.", args: [LISTING()] },
  { name: "watchlist_remove", group: "account_write", title: "Remove from Watchlist", desc: "Stop watching a company.", args: [LISTING()] },
  {
    name: "create_support_ticket",
    group: "account_write",
    title: "Open Support Ticket",
    desc: "Open a FirmLedger support ticket.",
    args: [
      s("subject", undefined, true),
      e("category", ["billing", "technical", "listing", "account", "verification", "other"], true),
      t("body", "The issue in a few sentences", true),
    ],
  },
  {
    name: "manage_job",
    group: "account_write",
    title: "Manage Job",
    desc: "Edit, close or remove one of your jobs.",
    destructive: true,
    args: [
      e("action", ["edit", "close", "remove", "delete"], true),
      n("job_id", undefined, true),
      s("title"),
      e("role_type", ROLE),
      s("location"),
      s("apply_url"),
      t("description"),
    ],
  },
  {
    name: "post_job",
    group: "account_write",
    title: "Post a Job",
    desc: "Submit a job on your listing (goes to moderation).",
    args: [
      OWN(),
      s("title", "≤80 chars", true),
      e("role_type", ROLE),
      s("location", "City or Remote", true),
      s("apply_url", "Full https:// link", true),
      t("description", "≤600 chars", true),
    ],
  },
  {
    name: "mark_notifications_read",
    group: "account_write",
    title: "Mark Notifications Read",
    desc: "Mark one (id) or all notifications as read.",
    args: [n("notification_id"), b("all")],
  },
  {
    name: "refresh_listing_scores",
    group: "account_write",
    title: "Refresh Listing Scores",
    desc: "Recompute confidence/health/completeness scores.",
    args: [OWN()],
  },
  {
    name: "refresh_listing_tech",
    group: "account_write",
    title: "Refresh Listing Tech",
    desc: "Rescan your website's technology snapshot.",
    args: [OWN()],
  },
  {
    name: "refresh_listing_news",
    group: "account_write",
    title: "Refresh Listing News",
    desc: "Look for new coverage (once a minute per listing).",
    args: [OWN()],
  },
  {
    name: "request_listing_removal",
    group: "account_write",
    title: "Request Listing Removal",
    desc: "Ask moderators to remove a listing you own.",
    destructive: true,
    args: [OWN(), t("reason", "Why (20+ characters)", true)],
  },
  {
    name: "create_webhook",
    group: "account_write",
    title: "Create Webhook",
    desc: "Register a signed webhook destination (secret shown once).",
    args: [
      s("url", "Public HTTPS URL", true),
      s("label"),
      l("events", "1-6 event types, one per line", true),
      l("categories", "Optional category filters"),
    ],
  },
  {
    name: "reply_to_ticket",
    group: "account_write",
    title: "Reply to Ticket",
    desc: "Reply in one of your open support tickets.",
    args: [s("ticket", "Reference (TK-…) or id", true), t("message", undefined, true)],
  },
  {
    name: "manage_webhooks",
    group: "account_write",
    title: "Manage Webhooks",
    desc: "Create, update, pause, resume, rotate secret, test, retry, delete.",
    destructive: true,
    args: [
      e("action", ["create", "update", "pause", "resume", "rotate_secret", "test", "retry_delivery", "delete"], true),
      n("webhook_id", "Required except for create"),
      s("url"),
      s("label"),
      l("events"),
      l("categories"),
      n("delivery_id", "For retry_delivery"),
    ],
  },
  {
    name: "manage_api_keys",
    group: "account_write",
    title: "Manage API Keys",
    desc: "Create, revoke or re-scope API keys (key-based connections only).",
    destructive: true,
    args: [
      e("action", ["create", "revoke", "update_scopes"], true),
      s("label", "For create"),
      l("scopes", "Scope ids, one per line"),
      n("key_id"),
      s("key_prefix"),
    ],
  },
  {
    name: "manage_my_revenue",
    group: "account_write",
    title: "Submit Revenue Change",
    desc: "Add/edit/delete reported revenue (moderated).",
    args: [
      LISTING(),
      e("action", ["save", "delete"], true),
      n("target_id", "Existing record id (edit/delete)"),
      s("amount"),
      s("currency", "3-letter, e.g. KES"),
      s("period", "e.g. 2025"),
      t("sources", "Public HTTPS URLs, one per line"),
    ],
  },
  {
    name: "update_my_listing",
    group: "account_write",
    title: "Edit My Listing",
    desc: "Change fields on a listing you own.",
    args: [
      OWN(),
      s("name"),
      s("tagline"),
      t("description"),
      s("website"),
      s("email"),
      s("phone"),
      s("country"),
      s("city"),
      s("region"),
      s("address"),
      s("logo_url"),
      s("founded"),
      s("size"),
      s("tags"),
      j("socials", 'JSON object, e.g. {"x":"https://x.com/you"}; {} clears'),
    ],
  },
  {
    name: "manage_lead",
    group: "account_write",
    title: "Archive / Restore / Delete Lead",
    desc: "Archive, unarchive or permanently delete a conversation.",
    destructive: true,
    args: [e("action", ["archive", "unarchive", "delete"], true), n("lead_id", undefined, true)],
  },
];

export const TOOL_MAP: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((d) => [d.name, d]));

export const GROUP_LABEL: Record<Group, string> = {
  open: "Open (no key needed)",
  pro: "Pro directory",
  account_read: "My account · read (Pro + read:account)",
  account_write: "My account · changes (Pro + write:account, always confirmed)",
};

export function isWrite(name: string): boolean {
  return TOOL_MAP[name]?.group === "account_write";
}

/** Convert raw form values into typed tool arguments. Throws Error with a readable message. */
export function coerceArgs(def: ToolDef, values: Record<string, unknown>): Args {
  const out: Args = {};
  const missing: string[] = [];
  for (const a of def.args) {
    const raw = values[a.name];
    const str = typeof raw === "string" ? raw.trim() : raw;
    const empty = raw === undefined || raw === null || str === "" || (Array.isArray(raw) && raw.length === 0);
    if (a.type === "bool") {
      if (raw === true) out[a.name] = true;
      continue;
    }
    if (empty) {
      if (a.req) missing.push(a.name);
      continue;
    }
    switch (a.type) {
      case "int": {
        const v = Number(str);
        if (!Number.isInteger(v)) throw new Error(`"${a.name}" must be a whole number`);
        out[a.name] = v;
        break;
      }
      case "list":
        out[a.name] = Array.isArray(raw)
          ? raw
          : String(str)
              .split(/[\n,]+/)
              .map((x) => x.trim())
              .filter(Boolean);
        break;
      case "json":
        try {
          out[a.name] = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          throw new Error(`"${a.name}" must be valid JSON`);
        }
        break;
      default:
        out[a.name] = str;
    }
  }
  if (missing.length) throw new Error(`Missing required: ${missing.join(", ")}`);
  return out;
}
