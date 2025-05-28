export type space = {
  name: string;
  domain: string;
  uniq_domain: string | null;
  uniq_subdomain: string;
  plan: string;
  plan_level: number;
  updated_at: Date;
  limits: {
    activities_owner_filter: boolean;
    activities_type_filter: boolean;
    activities_past_days_filter: number;
    max_custom_workflows: number;
    max_workflow_stages: number;
    min_character_search: number;
  };
  created_at: string;
  id: number;
  role: string;
  owner_id: number;
  story_published_hook: string | null;
  environments: environment[];
  stories_count: number;
  parent_id: number | null;
  assets_count: number;
  request_count_today: number;
  api_requests: number;
  exceeded_requests: number;
  euid: string | null;
  trial: boolean;
  default_root: string;
  has_slack_webhook: boolean;
  first_token: string;
  traffic_limit: number;
  has_pending_tasks: boolean;
  options: {
    is_demo: boolean;
    force_v1: boolean;
    force_v2: boolean;
    languages: string[];
    hosted_backup: boolean;
    onboarding_step: string;
    track_statistics: boolean;
    rev_share_enabled: boolean;
    required_assest_fields: string[];
    use_translated_stories: boolean;
  };
  assistance_mode: boolean;
  owner: {
    id: number;
    userid: string;
    real_email: string;
    friendly_name: string;
    avatar: string;
  };
  org?: {
    id?: number;
    name: string;
    avatar?: string;
  };
  required_assest_fields: string[];
  is_demo: boolean;
  rev_share_enabled: boolean;
  use_translated_stories: boolean;
  languages: string[];
  hosted_backup: boolean;
  onboarding_step: string;
  asset_custom_meta_data_schema: string[];
  region: string;
  force_v2: boolean;
  force_v1: boolean;
  track_statistics: boolean;
  fe_version: string;
  no_cc_community: boolean;
  feature_limits: feature[];
  collaborators: collaborator[];
};

export type spacesData = {
  isLoading: boolean;
  data: {
    spaces: space | space[];
  };
};

export type collaborator = {
  user: {
    id: number;
    firstname: string;
    lastname: string;
    alt_email: string | null;
    avatar: string | null;
    userid: string;
    friendly_name: string;
  };
  role: string;
  user_id: number;
  permissions: string[];
  allowed_path: string;
  field_permissions: string;
  id: number;
  space_role_id: number;
  invitation: {
    email: string;
    expires_at: Date;
  } | null;
  space_role_ids: number[];
  space_id: number;
  can_act_as_admin: boolean;
};

export type environment = {
  name: string;
  location: string;
};

export type feature = {
  key: string;
  limit: string;
  is_available: string;
};

export type asset = {
  id: number;
  filename: string;
  ext_id: null | string;
  asset_folder_id: null | string;
  is_private: boolean;
  content_type: string;
  content_length: number;
  created_at: string;
  updated_at: string;
  deleted_at: null | string;
  alt: null | string;
  title: null | string;
  copyright: null | string;
  focus: null | string;
  expire_at: null | string;
  source: null | string;
  space_id: number;
  internal_tag_ids: string[];
  locked: boolean;
  publish_at: null | string;
};

export type spaceRole = {
  id: number;
  readonly_field_permissions: string[];
  permissions: string[];
  role: string;
  subtitle: null | string;
  ext_id: null | string;
};

export type storyDetail = {
  name: string;
  parent_id: number;
  group_id: string;
  created_at: string;
  deleted_at: string | null;
  sort_by_date: string | null;
  tag_list: string[];
  updated_at: string;
  published_at: string | null;
  id: number;
  uuid: string;
  is_folder: boolean;
  content: {
    _uid: string;
    title: string;
    content: string;
    component: string;
  };
  published: boolean;
  slug: string;
  path: string | null;
  full_slug: string;
  default_root: string | null;
  disable_fe_editor: boolean;
  parent: {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    disable_fe_editor: boolean;
  };
  is_startpage: boolean;
  unpublished_changes: string | null;
  imported_at: string | null;
  preview_token: {
    token: string;
    timestamp: string;
  };
  pinned: boolean;
  breadcrumbs: {
    id: number;
    name: string;
    parent_id: number | null;
    disable_fe_editor: boolean;
    path: string | null;
    slug: string;
    translated_slugs: string[];
  }[];
  publish_at: string | null;
  expire_at: string | null;
  first_published_at: string | null;
  last_author: {
    id: number;
    userid: string;
    friendly_name: string | null;
  };
  user_ids: number[];
  space_role_ids: number[];
  translated_slugs: string[];
  localized_paths: string[];
  position: number;
  can_not_view: boolean;
  is_scheduled: string | null;
  scheduled_dates: string | null;
  favourite_for_user_ids: number[];
};

export type ActivityData = {
  activity: {
    id: number;
    trackable_id: number;
    trackable_type: string;
    owner_id: number;
    owner_type: string;
    key: string;
    recipient_id: number | null;
    recipient_type: string | null;
    created_at: string;
    updated_at: string;
    space_id: number;
  };
  trackable: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: number;
    userid: string;
    friendly_name: string;
    active: boolean;
  };
};

export type apiKey = {
  id: number;
  access: "private" | "public";
  branch_id: number | null;
  name: string | null;
  space_id: number;
  token: string;
  story_ids: number[];
  min_cache: number;
};
