import type { PostMetadata } from "../api/types";

export type AttachmentKind = "none" | "image" | "video";

/** Per-service attachment rules. Instagram, TikTok, and Pinterest always require an
 * attachment, so "none" is intentionally excluded. YouTube posts are always videos. */
export interface AttachmentRule {
  allowed: AttachmentKind[];
}

/**
 * Raw values coming off the Create Post form. Every network-specific field is optional
 * here since only the fields relevant to the selected channel's service are ever
 * rendered/populated.
 */
export interface PostFormValues {
  organizationId?: string;
  channelId: string;
  text: string;
  mode: string;
  schedulingType?: string;
  dueAt?: Date;
  attachmentType: string;
  imageUrl?: string;
  imageAltText?: string;
  imageThumbnailUrl?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  instagramPostType?: string;
  instagramShareToFeed?: boolean;
  instagramFirstComment?: string;
  instagramLink?: string;
  facebookPostType?: string;
  facebookFirstComment?: string;
  facebookLinkAttachment?: string;
  googlePostType?: string;
  googleWhatsNewButton?: string;
  googleWhatsNewLink?: string;
  googleOfferTitle?: string;
  googleOfferStartDate?: Date;
  googleOfferEndDate?: Date;
  googleOfferCode?: string;
  googleOfferLink?: string;
  googleOfferTerms?: string;
  googleEventTitle?: string;
  googleEventStartDate?: Date;
  googleEventEndDate?: Date;
  googleEventHasTime?: boolean;
  googleEventStartTime?: string;
  googleEventEndTime?: string;
  googleEventButton?: string;
  googleEventLink?: string;
  pinterestBoardId?: string;
  pinterestTitle?: string;
  pinterestUrl?: string;
  youtubeTitle?: string;
  youtubeCategoryId?: string;
  youtubePrivacy?: string;
  youtubeLicense?: string;
  youtubeMadeForKids?: boolean;
  youtubeEmbeddable?: boolean;
  youtubeNotifySubscribers?: boolean;
}

/**
 * Extra context a network's validate/build functions may need beyond the raw form
 * values, derived from the selected channel (its service + subtype).
 */
export interface NetworkContext {
  isFacebookGroup: boolean;
  isInstagramProfile: boolean;
}

export interface NetworkModule {
  attachmentRule: AttachmentRule;
  /** Throws an Error with a user-facing message if the form values are invalid for this network. */
  validate: (values: PostFormValues, ctx: NetworkContext) => void;
  /** Builds the service-specific metadata slice to submit, or undefined if this network has none. */
  buildMetadata: (
    values: PostFormValues,
    ctx: NetworkContext,
  ) => PostMetadata | undefined;
}
