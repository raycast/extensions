import {
  SITE_EXCERPT_COMPUTED_FIELDS,
  SITE_EXCERPT_REQUEST_FIELDS,
  SITE_EXCERPT_REQUEST_OPTIONS,
} from "./site-constants";

/*
 * Stripped down version of the SiteDetails interface from Calypso.
 * Most properties are here as we can use them in the future.
 */

type FeatureId = "domain" | "store" | "seo" | "plugins" | "ad-free" | "image-storage" | "video-storage" | "support";

export enum Visibility {
  PublicIndexed = 1,
  PublicNotIndexed = 0,
  Private = -1,
}

export interface CreateSiteParams {
  blog_name: string;
  blog_title?: string;
  authToken?: string;
  public?: Visibility;
  options?: {
    site_vertical?: string;
    site_vertical_name?: string;
    site_vertical_slug?: string;
    site_information?: {
      title?: string;
    };
    lang_id?: number;
    site_creation_flow?: string;
    enable_fse?: boolean;
    theme?: string;
    template?: string;
    timezone_string?: string;
    font_headings?: string;
    font_base?: string;
    use_patterns?: boolean;
    selected_features?: FeatureId[];
    wpcom_public_coming_soon?: number;
    anchor_fm_podcast_id?: string;
    is_blank_canvas?: boolean;
    is_videopress_initial_purchase?: boolean;
    wpcom_admin_interface?: string;
  };
}

export interface P2ThumbnailElements {
  color_link: string;
  color_sidebar_background: string;
  header_image: string | null;
}

export interface SiteDetailsPlan {
  product_id: number;
  product_slug: string;
  product_name: string;
  product_name_short: string;
  expired: boolean;
  billing_period: string;
  user_is_owner: boolean;
  is_free: boolean;
  features: {
    active: string[];
    available: Record<string, string[]>;
  };
}

export interface DifmLiteSiteOptions {
  site_category?: string;
  is_website_content_submitted?: boolean;
  selected_page_titles: string[];
}

export interface SiteDetails {
  ID: number;
  URL: string;
  capabilities: SiteDetailsCapabilities;
  description: string;
  domain: string;
  icon?: { ico: string; img: string; media_id: number };
  is_coming_soon?: boolean;
  is_multisite?: boolean;
  is_private?: boolean;
  is_vip?: boolean;
  is_wpcom_atomic?: boolean;
  is_wpcom_staging_site?: boolean;
  jetpack: boolean;
  lang?: string;
  launch_status: string;
  locale: string;
  name: string | undefined;
  options?: SiteDetailsOptions;
  p2_thumbnail_elements?: P2ThumbnailElements | null;
  plan?: SiteDetailsPlan;
  products?: SiteDetailsPlan[];
  single_user_site?: boolean;
  site_owner?: number;
  slug: string;
  title: string;
  visible?: boolean;
  was_ecommerce_trial?: boolean;
  was_migration_trial?: boolean;
  was_hosting_trial?: boolean;
  wpcom_url?: string;
  user_interactions?: string[];
}

export interface SiteDetailsCapabilities {
  activate_plugins: boolean;
  activate_wordads: boolean;
  delete_others_posts: boolean;
  delete_posts: boolean;
  delete_users: boolean;
  edit_others_pages: boolean;
  edit_others_posts: boolean;
  edit_pages: boolean;
  edit_posts: boolean;
  edit_theme_options: boolean;
  edit_users: boolean;
  list_users: boolean;
  manage_categories: boolean;
  manage_options: boolean;
  moderate_comments: boolean;
  own_site: boolean;
  promote_users: boolean;
  publish_posts: boolean;
  remove_users: boolean;
  upload_files: boolean;
  view_hosting: boolean;
  view_stats: boolean;
}

export interface SiteDetailsOptions {
  admin_url?: string;
  advanced_seo_front_page_description?: string;
  advanced_seo_title_formats?: string[];
  ak_vp_bundle_enabled?: boolean | null;
  allowed_file_types?: string[];
  anchor_podcast?: boolean;
  background_color?: boolean;
  blog_public?: number;
  created_at?: string;
  default_category?: number;
  default_comment_status?: boolean;
  default_likes_enabled?: boolean;
  default_ping_status?: boolean;
  default_post_format?: string;
  default_sharing_status?: boolean;
  design_type?: string | null;
  difm_lite_site_options?: DifmLiteSiteOptions | Record<string, never>;
  editing_toolkit_is_active?: boolean;
  featured_images_enabled?: boolean;
  frame_nonce?: string;
  gmt_offset?: number;
  header_image?: boolean;
  headstart?: boolean;
  headstart_is_fresh?: boolean;
  image_default_link_type?: string;
  image_large_height?: number;
  image_large_width?: number;
  image_medium_height?: number;
  image_medium_width?: number;
  image_thumbnail_crop?: number;
  image_thumbnail_height?: number;
  image_thumbnail_width?: number;
  import_engine?: string | null;
  is_automated_transfer?: boolean;
  is_cloud_eligible?: boolean;
  is_difm_lite_in_progress?: boolean;
  is_domain_only?: boolean;
  is_mapped_domain?: boolean;
  is_pending_plan?: boolean;
  is_redirect?: boolean;
  is_wpcom_atomic?: boolean;
  is_wpcom_store?: boolean;
  is_wpforteams_site?: boolean;
  jetpack_connection_active_plugins?: string[];
  jetpack_frame_nonce?: string;
  jetpack_version?: string | undefined;
  login_url?: string;
  p2_hub_blog_id?: number | null;
  page_for_posts?: number;
  page_on_front?: number;
  permalink_structure?: string;
  podcasting_archive?: boolean | null;
  post_formats?: string[];
  publicize_permanently_disabled?: boolean;
  selected_features?: FeatureId[];
  show_on_front?: string;
  site_intent?: string;
  site_segment?: string | null;
  site_vertical_id?: string | null;
  software_version?: string;
  theme_slug?: string;
  timezone?: string;
  unmapped_url?: string;
  updated_at?: string;
  upgraded_filetypes_enabled?: boolean;
  verification_services_codes?: string | null;
  videopress_enabled?: boolean;
  videopress_storage_used?: number;
  was_created_with_blank_canvas_design?: boolean;
  woocommerce_is_active?: boolean;
  wordads?: boolean;
  launchpad_screen?: false | "off" | "full" | "minimized";
  wpcom_production_blog_id?: number;
  wpcom_staging_blog_ids?: number[];
  can_blaze?: boolean;
  is_commercial?: boolean | null;
  wpcom_admin_interface?: string;
}

export type SiteExcerptNetworkData = Pick<SiteDetails, (typeof SITE_EXCERPT_REQUEST_FIELDS)[number]> & {
  options?: Pick<SiteDetailsOptions, (typeof SITE_EXCERPT_REQUEST_OPTIONS)[number]>;
};

export type SiteExcerptData = Pick<
  SiteDetails,
  (typeof SITE_EXCERPT_REQUEST_FIELDS)[number] | (typeof SITE_EXCERPT_COMPUTED_FIELDS)[number]
> & {
  title: string;
  options?: Pick<SiteDetailsOptions, (typeof SITE_EXCERPT_REQUEST_OPTIONS)[number]>;
};
