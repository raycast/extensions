export interface BaseResponse<T> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

export interface UserInfo {
  user_id: string;
  red_id: string;
  gender: 0 | 1;
  nickname: string;
  desc: string;
  images: string;
  guest: boolean;
}

export interface Sandbox {
  global: unknown;
  console: unknown;
  setTimeout: unknown;
  setInterval: unknown;
}

export interface NoteRequest {
  source_note_id: string;
  image_formats: string[];
  extra: { need_body_topic: string };
  xsec_source: string;
  xsec_token: string;
}

export interface NoteInfo {
  cursor_score: string;
  items: NoteItem[];
  current_time: number;
  has_more: boolean;
}

export interface ImageInfo {
  width: number;
  trace_id: string;
  url_pre: string;
  url_default: string;
  stream: Record<string, unknown>;
  live_photo: boolean;
  file_id: string;
  height: number;
  url: string;
  info_list: Array<{
    image_scene: string;
    url: string;
  }>;
}

export interface User {
  avatar: string;
  user_id: string;
  nickname: string;
}

export interface InteractInfo {
  liked_count: string;
  collected: boolean;
  collected_count: string;
  comment_count: string;
  share_count: string;
  followed: boolean;
  relation: string;
  liked: boolean;
}

export interface Tag {
  id: string;
  name: string;
  type: string;
}

export interface ShareInfo {
  un_share: boolean;
}

export interface NoteCard {
  image_list: ImageInfo[];
  at_user_list: unknown[];
  last_update_time: number;
  note_id: string;
  title: string;
  desc: string;
  user: User;
  interact_info: InteractInfo;
  tag_list: Tag[];
  time: number;
  ip_location: string;
  type: "image" | "video";
  share_info: ShareInfo;
  video?: VideoInfo;
  display_title: string;
  cover: ImageInfo;
}

export interface NoteItem {
  id: string;
  model_type: string;
  note_card: NoteCard;
  xsec_token: string;
}

export interface VideoInfo {
  media: {
    video_id: string;
    stream: {
      h264: { master_url: string }[];
      h265: { master_url: string }[];
    };
  };
}

export interface DetailData {
  type: "image" | "video";
  noteId: string;
  title: string;
  desc: string;
  tags: string[];
  user: {
    nickname: string;
    avatar: string;
  };
  video?: string;
  images: string[];
  originalUrl: string;
}

export interface SearchRequest {
  keyword: string;
  page: number;
  page_size: number;
  search_id: string;
  sort: "general";
  note_type: 0;
  ext_flags: [];
  geo: string;
  image_formats: string[];
}

export interface SearchResponse {
  has_more: boolean;
  items: NoteItem[];
}

export interface PostItem {
  title: string;
  noteId: string;
  xsecToken: string;
  originalUrl: string;
  user: {
    nickname: string;
    avatar: string;
  };
  cover: string;
  markdown: string;
}

export interface HomeFeedRequest {
  category: "homefeed_recommend";
  cursor_score: string;
  image_formats: string[];
  need_filter_image: boolean;
  need_num: number;
  num: number;
  note_index: number;
  refresh_type: number;
  search_key: string;
  unread_begin_note_id: string;
  unread_end_note_id: string;
  unread_note_count: number;
}
