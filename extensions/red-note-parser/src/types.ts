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
  global: Sandbox;
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
}

// 图片信息类型
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

// 用户信息类型
export interface User {
  avatar: string;
  user_id: string;
  nickname: string;
}

// 互动信息类型
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

// 标签类型
export interface Tag {
  id: string;
  name: string;
  type: string;
}

// 分享信息类型
export interface ShareInfo {
  un_share: boolean;
}

// 笔记卡片类型
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
  video: VideoInfo;
}

// 笔记项类型
export interface NoteItem {
  id: string;
  model_type: string;
  note_card: NoteCard;
}

// 视频信息类型
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
  video: string;
  images: string[];
  originalUrl: string;
}
