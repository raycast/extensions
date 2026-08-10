export interface Params {
  [key: string]: unknown;
}

export interface PaginationParams extends Params {
  page?: number;
  per?: number;
}

export type ChannelStatus = "private" | "closed" | "public";
export type BlockType = "Image" | "Text" | "Link" | "Media" | "Attachment" | "Channel" | "PendingBlock";
export type SearchScope = "all" | "my" | "following";
export type SearchSort =
  | "score_desc"
  | "position_desc"
  | "position_asc"
  | "created_at_desc"
  | "created_at_asc"
  | "updated_at_desc"
  | "updated_at_asc"
  | "name_asc"
  | "name_desc"
  | "connections_count_desc"
  | "random";

export interface ArenaOptions {
  accessToken?: string;
  baseURL?: string;
}

export interface ApiMeta {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
  next_page: number | null;
  prev_page: number | null;
  has_more_pages: boolean;
}

export interface Source {
  provider?: { name?: string; url?: string };
  title?: string;
  url?: string;
}

export interface Image {
  filename?: string;
  content_type?: string;
  updated_at?: string;
  thumb?: { url: string };
  display?: { url: string };
  original?: { url: string; file_size?: number; file_size_display?: string };
}

export interface Attachment {
  file_name: string;
  file_size: number;
  file_size_display: string;
  content_type: string;
  extension: string;
  url: string;
}

export interface User {
  id: number;
  slug: string;
  full_name: string;
  first_name: string;
  last_name: string;
  avatar: string;
  initials?: string;
  channel_count: number;
  following_count: number;
  follower_count: number;
  username?: string;
}

export interface ChannelAbilities {
  add_to?: boolean;
  update?: boolean;
  destroy?: boolean;
  manage_collaborators?: boolean;
}

export interface EmbeddedConnection {
  id: number;
}

export interface Channel {
  id: number;
  title: string;
  slug: string;
  /** Markdown/plain description from the API; null if none */
  description: string | null;
  owner_slug: string;
  status: ChannelStatus;
  open: boolean;
  published: boolean;
  length: number;
  created_at: string;
  updated_at: string;
  user: User;
  collaborators: User[];
  can?: ChannelAbilities;
  connection?: EmbeddedConnection | null;
}

export interface Connection extends Partial<Channel> {
  id?: number;
  title?: string;
  added_to_at?: string;
  updated_at?: string;
}

export interface Block {
  id: number;
  title: string | null;
  updated_at: string;
  created_at: string;
  state: string;
  comment_count: number;
  generated_title: string;
  class: BlockType;
  base_class: string;
  content: string | null;
  content_html: string | null;
  description: string | null;
  description_html: string | null;
  source: Source | null;
  image: Image | null;
  user: User;
  visibility: "public" | "private" | "orphan";
  slug: string;
  attachment?: Attachment;
  connection?: EmbeddedConnection | null;
}

export interface MinimalChannel {
  id?: number;
  slug: string;
  title: string;
  user: string | { full_name: string };
  open?: boolean;
  status?: ChannelStatus;
}

export interface SearchFilters extends PaginationParams {
  sort?: SearchSort;
  scope?: SearchScope;
  type?: string;
}

export interface PaginatedResponse {
  term: string;
  total_pages: number;
  current_page: number;
  per: number;
  meta?: ApiMeta;
}

export interface SearchUsersResponse extends PaginatedResponse {
  users: User[];
}

export interface SearchChannelsResponse extends PaginatedResponse {
  channels: Channel[];
}

export interface SearchBlocksResponse extends PaginatedResponse {
  blocks: Block[];
}

export interface SearchResponse extends PaginatedResponse {
  users: User[];
  channels: Channel[];
  blocks: Block[];
}
