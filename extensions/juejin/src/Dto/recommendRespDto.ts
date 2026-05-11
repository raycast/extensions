export interface RecommendFeedRespDto {
  err_no: number;
  err_msg: string;
  data: ArticleData[];
  cursor: string;
  count: number;
  has_more: boolean;
}

export interface ArticleData {
  article_id: string;
  article_info: ArticleInfo;
  author_user_info: AuthorUserInfo;
  category: Category;
  tags: Tag[];
  user_interact: UserInteract;
  org: Org;
  req_id: string;
  status: Status;
  theme_list: [];
  extra: Extra;
}

export interface ArticleInfo {
  article_id: string;
  user_id: string;
  category_id: string;
  tag_ids: number[];
  visible_level: number;
  link_url: string;
  cover_image: string;
  is_gfw: number;
  title: string;
  brief_content: string;
  is_english: number;
  is_original: number;
  user_index: number;
  original_type: number;
  original_author: string;
  content: string;
  ctime: string;
  mtime: string;
  rtime: string;
  draft_id: string;
  view_count: number;
  collect_count: number;
  digg_count: number;
  comment_count: number;
  hot_index: number;
  is_hot: number;
  rank_index: number;
  status: number;
  verify_status: number;
  audit_status: number;
  mark_content: string;
  display_count: number;
  is_markdown: number;
  app_html_content: string;
  version: number;
  web_html_content: null;
  meta_info: null;
  catalog: null;
  homepage_top_time: number;
  homepage_top_status: number;
  content_count: number;
  read_time: string;
  pics_expire_time: number;
}

export interface AuthorUserInfo {
  user_id: string;
  user_name: string;
  company: string;
  job_title: string;
  avatar_large: string;
  level: number;
  description: string;
  followee_count: number;
  follower_count: number;
  post_article_count: number;
  digg_article_count: number;
  got_digg_count: number;
  got_view_count: number;
  post_shortmsg_count: number;
  digg_shortmsg_count: number;
  isfollowed: boolean;
  favorable_author: number;
  power: number;
  study_point: number;
  university: University;
  major: Major;
  student_status: number;
  select_event_count: number;
  select_online_course_count: number;
  identity: number;
  is_select_annual: boolean;
  select_annual_rank: number;
  annual_list_type: number;
  extraMap: ExtraMap;
  is_logout: number;
  annual_info: [];
  account_amount: number;
  user_growth_info: UserGrowthInfo;
  is_vip: boolean;
  become_author_days: number;
  collection_set_article_count: number;
  recommend_article_count_daily: number;
  article_collect_count_daily: number;
  user_priv_info: UserPrivInfo;
}

export interface ExtraMap {}

export interface Major {
  major_id: string;
  parent_id: string;
  name: string;
}

export interface University {
  university_id: string;
  name: string;
  logo: string;
}

export interface UserGrowthInfo {
  user_id: number;
  jpower: number;
  jscore: number;
  jpower_level: number;
  jscore_level: number;
  jscore_title: string;
  author_achievement_list: [];
  vip_level: number;
  vip_title: string;
  jscore_next_level_score: number;
  jscore_this_level_mini_score: number;
  vip_score: number;
}

export interface UserPrivInfo {
  administrator: number;
  builder: number;
  favorable_author: number;
  book_author: number;
  forbidden_words: number;
  can_tag_cnt: number;
  auto_recommend: number;
  signed_author: number;
  popular_author: number;
  can_add_video: number;
}

export interface Category {
  category_id: string;
  category_name: string;
  category_url: string;
  rank: number;
  back_ground: string;
  icon: string;
  ctime: number;
  mtime: number;
  show_type: number;
  item_type: number;
  promote_tag_cap: number;
  promote_priority: number;
}

export interface Extra {
  extra: string;
}

export interface Org {
  is_followed: boolean;
}

export interface Status {
  push_status: number;
}

export interface Tag {
  id: number;
  tag_id: string;
  tag_name: string;
  color: string;
  icon: string;
  back_ground: string;
  show_navi: number;
  ctime: number;
  mtime: number;
  id_type: number;
  tag_alias: string;
  post_article_count: number;
  concern_user_count: number;
}

export interface UserInteract {
  id: number;
  omitempty: number;
  user_id: number;
  is_digg: boolean;
  is_follow: boolean;
  is_collect: boolean;
  collect_set_count: number;
}
