// WordPress REST API Types

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: "publish" | "future" | "draft" | "pending" | "private" | "trash";
  type: string;
  link: string;
  title: {
    rendered: string;
    raw?: string;
  };
  content: {
    rendered: string;
    raw?: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    raw?: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: "open" | "closed";
  ping_status: "open" | "closed";
  sticky: boolean;
  format: string;
  categories: number[];
  tags: number[];
  _embedded?: {
    author?: WPUser[];
    "wp:featuredmedia"?: WPMedia[];
    "wp:term"?: WPTerm[][];
  };
}

export interface WPPage {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: "publish" | "future" | "draft" | "pending" | "private" | "trash";
  type: string;
  link: string;
  title: {
    rendered: string;
    raw?: string;
  };
  content: {
    rendered: string;
    raw?: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    raw?: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  template: string;
  _embedded?: {
    author?: WPUser[];
    "wp:featuredmedia"?: WPMedia[];
  };
}

export interface WPMedia {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
    raw?: string;
  };
  author: number;
  caption: {
    rendered: string;
    raw?: string;
  };
  alt_text: string;
  media_type: "image" | "file" | "audio" | "video";
  mime_type: string;
  source_url: string;
  media_details: {
    width?: number;
    height?: number;
    file?: string;
    filesize?: number;
    sizes?: {
      [key: string]: {
        file: string;
        width: number;
        height: number;
        mime_type: string;
        source_url: string;
      };
    };
  };
}

export interface WPComment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_url: string;
  author_email?: string;
  date: string;
  date_gmt: string;
  content: {
    rendered: string;
    raw?: string;
  };
  link: string;
  status: "approved" | "hold" | "spam" | "trash";
  type: string;
  author_avatar_urls: {
    [size: string]: string;
  };
  _embedded?: {
    up?: WPPost[];
  };
}

export interface WPUser {
  id: number;
  username?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: {
    [size: string]: string;
  };
  roles?: string[];
  registered_date?: string;
}

export interface WPPlugin {
  plugin: string;
  status: "active" | "inactive";
  name: string;
  plugin_uri: string;
  author: string;
  author_uri: string;
  description: {
    raw: string;
    rendered: string;
  };
  version: string;
  network_only: boolean;
  requires_wp: string;
  requires_php: string;
  textdomain: string;
}

export interface WPTerm {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent?: number;
}

export interface WPCategory extends WPTerm {
  taxonomy: "category";
}

export interface WPTag extends WPTerm {
  taxonomy: "post_tag";
}

export interface WPSiteInfo {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  timezone_string: string;
  namespaces: string[];
  authentication: Record<string, unknown>;
  routes: Record<string, unknown>;
  site_logo?: number;
  site_icon?: number;
  site_icon_url?: string;
}

// Request/Response types
export interface CreatePostParams {
  title: string;
  content?: string;
  excerpt?: string;
  status?: "publish" | "future" | "draft" | "pending" | "private" | "trash";
  slug?: string;
  author?: number;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
  sticky?: boolean;
  format?: string;
}

export interface UpdatePostParams extends Partial<CreatePostParams> {
  id: number;
}

export interface CreatePageParams {
  title: string;
  content?: string;
  excerpt?: string;
  status?: "publish" | "future" | "draft" | "pending" | "private" | "trash";
  slug?: string;
  author?: number;
  featured_media?: number;
  parent?: number;
  menu_order?: number;
  template?: string;
}

export interface UpdatePageParams extends Partial<CreatePageParams> {
  id: number;
}

export interface SearchParams {
  search?: string;
  page?: number;
  per_page?: number;
  status?: string | string[];
  orderby?: string;
  order?: "asc" | "desc";
}

export interface ApiError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}
