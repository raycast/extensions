import { Icon } from "@raycast/api";

export type Me = {
  id: number;
  hnid: string;
  first_name: string;
  last_name: string;
  email?: string;
  yc_companies?: Array<{ id: number; name: string; batch: string }>;
};

// A step the YC agent took while answering (e.g. searching the forum). The CLI
// pre-formats a human-readable `display_message`; we fall back to entity/query
// if a future shape omits it.
export type AgentToolCall = {
  name: string;
  arguments?: {
    entity?: string;
    query?: string;
    display_message?: string;
  };
};

export type AgentResponse = {
  query: string;
  response: string;
  tool_calls?: AgentToolCall[];
};

export type Position = {
  user_id?: number;
  model_type?: string;
  model_id?: number;
  first_name?: string;
  last_name?: string;
  avatar_thumb?: string | null;
  position_start?: string | null;
  position_end?: string | null;
  bio?: string | null;
  title?: string | null;
  search_path?: string;
  company_name?: string;
  company_logo_url?: string | null;
  company_batches?: string[];
  company_batch_name?: string;
  company_yc?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  company_id?: number;
  role?: string;
};

export type UserAttributes = {
  id: number;
  first_name: string;
  last_name: string;
  avatar_thumb: string | null;
  banner_thumb: string | null;
  search_path: string;
  all_positions: Position[];
  current_industry: string[];
  current_location: string | null;
};

export type CompanyAttributes = {
  id: number;
  name: string;
  small_logo_thumb_url: string | null;
  batches: string[];
  one_liner: string;
  search_path: string;
  long_description: string | null;
  industries: string[];
  all_locations: string;
  active_founders: Position[];
  inactive_founders: Position[];
  active_positions: Position[];
  inactive_positions: Position[];
  former_names: string[];
  nonyc: boolean;
};

export type SchoolAttributes = {
  id: number;
  name: string;
  search_path: string;
  alumni: Array<{
    user_id?: number;
    first_name?: string;
    last_name?: string;
    avatar_thumb?: string | null;
    search_path?: string;
  }>;
};

export type PostUser = {
  name: string;
  id: number;
  model_type: string;
  model_id: number;
  avatar_thumb: string | null;
  search_path: string;
  company:
    | false
    | {
        name: string;
        id: number;
        batches?: string[];
        small_logo_thumb_url?: string | null;
        search_path?: string;
      };
};

export type PostAttributes = {
  id: number;
  title: string;
  body: string;
  comment_count: number;
  views_count: number;
  search_path: string;
  searchable_user: PostUser;
  top_comment: {
    id: number;
    body: string;
    user: PostUser;
  } | null;
  created_at: string;
};

export type DealAttributes = {
  id: number;
  title: string;
  details: string;
  company_name: string;
  company_batches: string[] | null;
  collection: string[];
  high_value: boolean;
  search_path: string;
  logo_url: string | null;
};

export type EmployerAttributes = {
  id: number;
  name: string;
  search_path: string;
  logo_url: string | null;
};

export type StartupLibraryAttributes = {
  id: number;
  title: string;
  body: string;
  description: string;
  search_path: string;
  categories: string[];
  parents: Array<{ title: string; slug: string }>;
  view_access?: string;
  root_id?: number;
};

// Knowledge-base articles share the Startup Library attribute shape exactly
// (id/title/body/description/categories/parents/view_access/root_id). Kept as a
// distinct alias so the union stays honest and a future shape drift is catchable
// independently — but `description` can be null here, unlike Startup Library.
export type KnowledgeBaseAttributes = Omit<
  StartupLibraryAttributes,
  "description"
> & {
  description: string | null;
};

export type SearchItem =
  | { type: "user"; path: string; displayed_attributes: UserAttributes }
  | {
      type: "yc_company";
      path: string;
      displayed_attributes: CompanyAttributes;
    }
  | {
      type: "non_yc_company";
      path: string;
      displayed_attributes: CompanyAttributes;
    }
  | { type: "school"; path: string; displayed_attributes: SchoolAttributes }
  | { type: "post"; path: string; displayed_attributes: PostAttributes }
  | { type: "deal"; path: string; displayed_attributes: DealAttributes }
  | { type: "employer"; path: string; displayed_attributes: EmployerAttributes }
  | {
      type: "startup_library";
      path: string;
      displayed_attributes: StartupLibraryAttributes;
    }
  | {
      type: "knowledge_base";
      path: string;
      displayed_attributes: KnowledgeBaseAttributes;
    };

export type SearchItemType = SearchItem["type"];

export type SearchResponse = {
  items: SearchItem[];
};

export const SEARCH_TYPE_LABELS: Record<SearchItemType, string> = {
  user: "People",
  yc_company: "YC Companies",
  non_yc_company: "Non-YC Companies",
  school: "Schools",
  post: "Posts",
  deal: "Deals",
  employer: "Employers",
  startup_library: "Startup Library",
  knowledge_base: "Knowledge Base",
};

// Maps our result-item types to the CLI's `yc search --type <X>` vocabulary,
// used only for CSV export. The `--type` endpoint returns a different,
// CSV-oriented envelope (not our rich `items[]`), so it's unsuitable for
// rendering — but it exposes the full matching set (total_count, not just the
// displayed page), which makes it a good "export everything that matched" path.
// `user` → founders and `post` → forum because the CLI names the source table,
// not our display label. Verified against yc 0.0.14.
//
// `null` for the LOSSY siblings: `non_yc_company` and `yc_company` both come
// from the CLI's `companies` action, and `startup_library`/`knowledge_base`
// both from `knowledge_base`. Exporting `non_yc_company` via `companies` would
// silently include YC companies (and vice versa for the library/KB pair), so
// the export is offered only for the canonical type (yc_company, knowledge_base)
// — the sibling maps to null and its export action is suppressed.
export const CLI_SEARCH_TYPE: Record<SearchItemType, string | null> = {
  user: "founders",
  yc_company: "companies",
  non_yc_company: null,
  school: "alumni_groups",
  post: "forum",
  deal: "deals",
  employer: "staff",
  startup_library: null,
  knowledge_base: "knowledge_base",
};

export const SEARCH_TYPE_ICONS: Record<SearchItemType, Icon> = {
  user: Icon.Person,
  yc_company: Icon.Building,
  non_yc_company: Icon.Building,
  school: Icon.Book,
  post: Icon.SpeechBubble,
  deal: Icon.Cart,
  employer: Icon.Building,
  startup_library: Icon.BlankDocument,
  knowledge_base: Icon.Book,
};

export const SEARCH_TYPE_ORDER: SearchItemType[] = [
  "yc_company",
  "user",
  "post",
  "deal",
  "non_yc_company",
  "startup_library",
  "knowledge_base",
  "school",
  "employer",
];
