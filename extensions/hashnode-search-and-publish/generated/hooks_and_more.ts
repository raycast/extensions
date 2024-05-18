import { FieldPolicy, FieldReadFunction, TypePolicies, TypePolicy } from '@apollo/client/cache';
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T;
export type InputMaybe<T> = T;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  ObjectId: { input: any; output: any; }
};

export type AddCommentInput = {
  contentMarkdown: Scalars['String']['input'];
  postId: Scalars['ID']['input'];
};

export type AddCommentPayload = {
  __typename?: 'AddCommentPayload';
  comment?: Maybe<Comment>;
};

export type AddPostToSeriesInput = {
  /** The ID of the post to be added to the series. */
  postId: Scalars['ObjectId']['input'];
  /** The ID of the series to which the post is to be added. */
  seriesId: Scalars['ObjectId']['input'];
};

export type AddPostToSeriesPayload = {
  __typename?: 'AddPostToSeriesPayload';
  /** The series to which the post was added. */
  series?: Maybe<Series>;
};

export type AddReplyInput = {
  commentId: Scalars['ID']['input'];
  contentMarkdown: Scalars['String']['input'];
};

export type AddReplyPayload = {
  __typename?: 'AddReplyPayload';
  reply?: Maybe<Reply>;
};

/**
 * Contains the flag indicating if the audio blog feature is enabled or not.
 * User can enable or disable the audio blog feature from the publication settings.
 * Shows audio player on blogs if enabled.
 */
export type AudioBlogFeature = Feature & {
  __typename?: 'AudioBlogFeature';
  /** A flag indicating if the audio blog feature is enabled or not. */
  isEnabled: Scalars['Boolean']['output'];
  /** The voice type for the audio blog. */
  voiceType: AudioBlogVoiceType;
};

/** The voice type for the audio blog. */
export enum AudioBlogVoiceType {
  /** Enum for the female voice type of the audio blog. */
  Female = 'FEMALE',
  /** Enum for the male voice type of the audio blog. */
  Male = 'MALE'
}

/** Used when Audioblog feature is enabled. Contains URLs to the audioblog of the post. */
export type AudioUrls = {
  __typename?: 'AudioUrls';
  /** Female version of audio url of the post. */
  female?: Maybe<Scalars['String']['output']>;
  /** Male version of audio url of the post. */
  male?: Maybe<Scalars['String']['output']>;
};

/** The status of the backup i.e., success or failure. */
export enum BackupStatus {
  /** The backup failed. */
  Failed = 'failed',
  /** The backup was successful. */
  Success = 'success'
}

/** A badge that the user has earned. */
export type Badge = Node & {
  __typename?: 'Badge';
  /** The date the badge was earned. */
  dateAssigned?: Maybe<Scalars['DateTime']['output']>;
  /** The description of the badge. */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of the badge. */
  id: Scalars['ID']['output'];
  /** The image of the badge. */
  image: Scalars['String']['output'];
  /** Link to badge page on Hashnode. */
  infoURL?: Maybe<Scalars['String']['output']>;
  /** The name of the badge. */
  name: Scalars['String']['output'];
  /** A flag to determine if the badge is hidden. */
  suppressed?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * Contains basic information about the beta feature.
 * A beta feature is a feature that is not yet released to all users.
 */
export type BetaFeature = Node & {
  __typename?: 'BetaFeature';
  /** The description of the beta feature. */
  description?: Maybe<Scalars['String']['output']>;
  /** The date the beta feature was created. */
  enabled: Scalars['Boolean']['output'];
  /** The ID of the beta feature. */
  id: Scalars['ID']['output'];
  /** The key of the beta feature. */
  key: Scalars['String']['output'];
  /** The title of the beta feature. */
  title?: Maybe<Scalars['String']['output']>;
  /** The url of the beta feature. */
  url?: Maybe<Scalars['String']['output']>;
};

export type CancelScheduledDraftInput = {
  /** The Draft ID of the scheduled draft. */
  draftId: Scalars['ID']['input'];
};

export type CancelScheduledDraftPayload = {
  __typename?: 'CancelScheduledDraftPayload';
  /** Payload returned in response of cancel scheduled post mutation. */
  scheduledPost: ScheduledPost;
};

/**
 * Contains basic information about the comment.
 * A comment is a response to a post.
 */
export type Comment = Node & {
  __typename?: 'Comment';
  /** The author of the comment. */
  author: User;
  /** The content of the comment in markdown and html format. */
  content: Content;
  /** The date the comment was created. */
  dateAdded: Scalars['DateTime']['output'];
  /** The ID of the comment. */
  id: Scalars['ID']['output'];
  /** Total number of reactions on the comment by the authenticated user. User must be authenticated to use this field. */
  myTotalReactions: Scalars['Int']['output'];
  /** Returns a list of replies to the comment. */
  replies: CommentReplyConnection;
  /** A unique string identifying the comment. Used as element id in the DOM on hashnode blogs. */
  stamp?: Maybe<Scalars['String']['output']>;
  /** Total number of reactions on the comment. Reactions are hearts added to any comment. */
  totalReactions: Scalars['Int']['output'];
};


/**
 * Contains basic information about the comment.
 * A comment is a response to a post.
 */
export type CommentRepliesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
};

/**
 * Connection to get list of replies to a comment.
 * Returns a list of edges which contains the posts in publication and cursor to the last item of the previous page.
 */
export type CommentReplyConnection = Connection & {
  __typename?: 'CommentReplyConnection';
  /**
   * A list of edges containing nodes in the connection.
   * A node contains a reply to a comment.
   */
  edges: Array<CommentReplyEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/** An edge that contains a node of type reply and cursor to the node. */
export type CommentReplyEdge = Edge & {
  __typename?: 'CommentReplyEdge';
  /** A cursor to the last item of the previous page. */
  cursor: Scalars['String']['output'];
  /** The node containing a reply to a comment. */
  node: Reply;
};

/**
 * Connection to get list of top commenters. Contains a list of edges containing nodes.
 * Each node is a user who commented recently.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type CommenterUserConnection = Connection & {
  __typename?: 'CommenterUserConnection';
  /** A list of edges of commenters. */
  edges: Array<UserEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * Connection to get list of items.
 * Returns a list of edges which contains the items and cursor to the last item of the previous page.
 * This is a common interface for all connections.
 */
export type Connection = {
  /** A list of edges of items connection. */
  edges: Array<Edge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type Content = {
  __typename?: 'Content';
  /** The HTML version of the content. */
  html: Scalars['String']['output'];
  /** The Markdown version of the content. */
  markdown: Scalars['String']['output'];
  /** The text version from sanitized html content. HTML tags are stripped and only text is returned. */
  text: Scalars['String']['output'];
};

/** Contains information about cover image options of the post. Like URL of the cover image, attribution, etc. */
export type CoverImageOptionsInput = {
  /** Information about the cover image attribution. */
  coverImageAttribution?: InputMaybe<Scalars['String']['input']>;
  /** The name of the cover image photographer, used when cover was chosen from unsplash. */
  coverImagePhotographer?: InputMaybe<Scalars['String']['input']>;
  /** The URL of the cover image. */
  coverImageURL?: InputMaybe<Scalars['String']['input']>;
  /** A flag to indicate if the cover attribution is hidden, used when cover was chosen from unsplash. */
  isCoverAttributionHidden?: InputMaybe<Scalars['Boolean']['input']>;
  /** A flag to indicate if the cover image is sticked to bottom. */
  stickCoverToBottom?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateWebhookInput = {
  events: Array<WebhookEvent>;
  publicationId: Scalars['ID']['input'];
  secret: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type CreateWebhookPayload = {
  __typename?: 'CreateWebhookPayload';
  webhook?: Maybe<Webhook>;
};

export type CustomCss = {
  __typename?: 'CustomCSS';
  /** Custom CSS that will be applied on the publication homepage. */
  home?: Maybe<Scalars['String']['output']>;
  /** The same as `home` but minified. */
  homeMinified?: Maybe<Scalars['String']['output']>;
  /** Custom CSS that will be applied on all posts of the publication. */
  post?: Maybe<Scalars['String']['output']>;
  /** The same as `post` but minified. */
  postMinified?: Maybe<Scalars['String']['output']>;
  /** Custom CSS that will be applied on all static pages of the publication. */
  static?: Maybe<Scalars['String']['output']>;
  /** The same as `static` but minified. */
  staticMinified?: Maybe<Scalars['String']['output']>;
};

export type CustomCssFeature = Feature & {
  __typename?: 'CustomCSSFeature';
  /** CSS that is not published yet. */
  draft?: Maybe<CustomCss>;
  /** A flag indicating if the custom CSS feature is enabled or not. */
  isEnabled: Scalars['Boolean']['output'];
  /** CSS that is live. */
  published?: Maybe<CustomCss>;
};

/** Contains the publication's dark mode preferences. */
export type DarkModePreferences = {
  __typename?: 'DarkModePreferences';
  /** A flag indicating if the dark mode is enabled for the publication. */
  enabled?: Maybe<Scalars['Boolean']['output']>;
  /** The custom dark mode logo of the publication. */
  logo?: Maybe<Scalars['String']['output']>;
};

export type DeleteWebhookPayload = {
  __typename?: 'DeleteWebhookPayload';
  webhook?: Maybe<Webhook>;
};

/** Contains the publication's domain information. */
export type DomainInfo = {
  __typename?: 'DomainInfo';
  /** The domain of the publication. */
  domain?: Maybe<DomainStatus>;
  /**
   * The subdomain of the publication on hashnode.dev.
   *
   * It will redirect to you custom domain if it is present and ready.
   */
  hashnodeSubdomain?: Maybe<Scalars['String']['output']>;
  /** The www prefixed domain of the publication. Says if redirect to www domain is configured. */
  wwwPrefixedDomain?: Maybe<DomainStatus>;
};

/** Contains the publication's domain status. */
export type DomainStatus = {
  __typename?: 'DomainStatus';
  /** The host of the publication domain. */
  host: Scalars['String']['output'];
  /** A flag indicating if the publication domain is ready. */
  ready: Scalars['Boolean']['output'];
};

/**
 * Contains basic information about the draft.
 * A draft is a post that is not published yet.
 */
export type Draft = Node & {
  __typename?: 'Draft';
  /** The author of the draft. */
  author: User;
  canonicalUrl?: Maybe<Scalars['String']['output']>;
  /**
   * Returns the user details of the co-authors of the post.
   * Hashnode users can add up to 4 co-authors as collaborators to their posts.
   * This functionality is limited to teams publication.
   */
  coAuthors?: Maybe<Array<User>>;
  /** Content of the draft in HTML and markdown */
  content?: Maybe<Content>;
  /** The cover image preference of the draft. Contains cover image URL and other details. */
  coverImage?: Maybe<DraftCoverImage>;
  /**
   * The date the draft was updated.
   * @deprecated Use updatedAt instead. Will be removed on 26/12/2023.
   */
  dateUpdated: Scalars['DateTime']['output'];
  /** Draft feature-related fields. */
  features: DraftFeatures;
  /** The ID of the draft. */
  id: Scalars['ID']['output'];
  /** Information about the last backup of the draft. */
  lastBackup?: Maybe<DraftBackup>;
  /** The date the draft last failed to back up. */
  lastFailedBackupAt?: Maybe<Scalars['DateTime']['output']>;
  /** The date the draft was last successfully backed up. */
  lastSuccessfulBackupAt?: Maybe<Scalars['DateTime']['output']>;
  /** OG meta-data of the draft. Contains image url used in open graph meta tags. */
  ogMetaData?: Maybe<OpenGraphMetaData>;
  readTimeInMinutes: Scalars['Int']['output'];
  /** SEO information of the draft. Contains title and description used in meta tags. */
  seo?: Maybe<Seo>;
  /** Information of the series the draft belongs to. */
  series?: Maybe<Series>;
  settings: DraftSettings;
  slug: Scalars['String']['output'];
  /** The subtitle of the draft. It would become the subtitle of the post when published. */
  subtitle?: Maybe<Scalars['String']['output']>;
  /**
   * Returns list of tags added to the draft. Contains tag id, name, slug, etc.
   * @deprecated Use tagsV2 instead. Will be removed on 26/02/2024.
   */
  tags: Array<Tag>;
  tagsV2: Array<DraftTag>;
  /** The title of the draft. It would become the title of the post when published. */
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type DraftBackup = {
  __typename?: 'DraftBackup';
  /** The date the backup was created. */
  at?: Maybe<Scalars['DateTime']['output']>;
  /** The status of the backup i.e., success or failure. */
  status?: Maybe<BackupStatus>;
};

/**
 * Contains basic information about a Tag within a Draft.
 * A tag in a draft is a tag that is not published yet.
 */
export type DraftBaseTag = {
  __typename?: 'DraftBaseTag';
  /** The name of the tag. Shown in tag page. */
  name: Scalars['String']['output'];
  /** The slug of the tag. Used to access tags feed.  Example https://hashnode.com/n/graphql */
  slug: Scalars['String']['output'];
};

/**
 * Connection to get list of drafts.
 * Returns a list of edges which contains the draft and cursor to the last item of the previous page.
 */
export type DraftConnection = Connection & {
  __typename?: 'DraftConnection';
  /** A list of edges of drafts connection. */
  edges: Array<DraftEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/** Contains information about the cover image of the draft. */
export type DraftCoverImage = {
  __typename?: 'DraftCoverImage';
  /** Provides attribution information for the cover image, if available. */
  attribution?: Maybe<Scalars['String']['output']>;
  /** True if the image attribution should be hidden. */
  isAttributionHidden: Scalars['Boolean']['output'];
  /** The name of the photographer who captured the cover image. */
  photographer?: Maybe<Scalars['String']['output']>;
  /** The URL of the cover image. */
  url: Scalars['String']['output'];
};

/** An edge that contains a node of type draft and cursor to the node. */
export type DraftEdge = Edge & {
  __typename?: 'DraftEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** A node in the connection containing a draft. */
  node: Draft;
};

export type DraftFeatures = {
  __typename?: 'DraftFeatures';
  tableOfContents: TableOfContentsFeature;
};

export type DraftSettings = {
  __typename?: 'DraftSettings';
  /** A flag to indicate if the comments are disabled for the post. */
  disableComments: Scalars['Boolean']['output'];
  /** Wether or not the post is hidden from the Hashnode community. */
  isDelisted: Scalars['Boolean']['output'];
  /** A flag to indicate if the cover image is shown below title of the post. Default position of cover is top of title. */
  stickCoverToBottom: Scalars['Boolean']['output'];
};

export type DraftTag = DraftBaseTag | Tag;

/**
 * An edge that contains a node and cursor to the node.
 * This is a common interface for all edges.
 */
export type Edge = {
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** A node in the connection. */
  node: Node;
};

/** The input for the email import acknowledgement mutation. */
export type EmailCurrentImport = {
  __typename?: 'EmailCurrentImport';
  /** The number of subscribers that have attempted to import */
  attemptedToImport?: Maybe<Scalars['Int']['output']>;
  /** The filename of the csv file containing emails */
  filename?: Maybe<Scalars['String']['output']>;
  /** The date the import started */
  importStartedAt: Scalars['DateTime']['output'];
  /** The status of the import */
  status: EmailImportStatus;
  /** The number of subscribers that have been successfully imported */
  successfullyImported?: Maybe<Scalars['Int']['output']>;
};

/** Contains information about the email import. */
export type EmailImport = {
  __typename?: 'EmailImport';
  /** Contains information about the current import example if it is in progress or has finished, date started, etc */
  currentImport?: Maybe<EmailCurrentImport>;
};

/** The status of the email import. */
export enum EmailImportStatus {
  /** There was an error during the import. */
  Failed = 'FAILED',
  /** The import has been acknowledged by the user. */
  Finished = 'FINISHED',
  /** Import has been initialized but is not yet in progress. */
  Initialized = 'INITIALIZED',
  /** Import is in progress. */
  InProgress = 'IN_PROGRESS',
  /** Import has to be reviewed by Hashnode. It is not yet reviewed. */
  InReview = 'IN_REVIEW',
  /** The has been rejected. Nothing has been imported. */
  Rejected = 'REJECTED',
  /** Import was successful. New emails have been imported. */
  Success = 'SUCCESS'
}

/** Common fields that describe a feature. */
export type Feature = {
  /** Whether the feature is enabled or not. */
  isEnabled: Scalars['Boolean']['output'];
};

export type FeedFilter = {
  /** Adds a filter to return posts with maximum number of minutes required to read the post. */
  maxReadTime?: InputMaybe<Scalars['Int']['input']>;
  /** Adds a filter to return posts with minimum number of minutes required to read the post. */
  minReadTime?: InputMaybe<Scalars['Int']['input']>;
  /** Adds a filter to return posts with tagged with provided tags only. */
  tags?: InputMaybe<Array<Scalars['ObjectId']['input']>>;
  /** The type of feed to be returned. */
  type?: InputMaybe<FeedType>;
};

/**
 * Connection for posts within a feed. Contains a list of edges containing nodes.
 * Each node is a post.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type FeedPostConnection = Connection & {
  __typename?: 'FeedPostConnection';
  /** A list of edges containing Post information */
  edges: Array<PostEdge>;
  /** Information for pagination in Post connection. */
  pageInfo: PageInfo;
};

/** Contains information about type of feed to be returned. */
export enum FeedType {
  /** Returns posts which were bookmarked by the user, sorted based on recency. */
  Bookmarks = 'BOOKMARKS',
  /** Returns posts which were featured, sorted based on recency. */
  Featured = 'FEATURED',
  /**
   * Returns only posts of the users you follow or publications you have subscribed to.
   *
   * Note: You have to be authenticated to use this feed type.
   */
  Following = 'FOLLOWING',
  /**
   * Returns only posts based on users following and interactions.
   *
   * Personalised feed is curated per requesting user basis.
   */
  Personalized = 'PERSONALIZED',
  /** Returns posts which were viewed by the user, sorted based on recency. */
  ReadingHistory = 'READING_HISTORY',
  /** Returns posts which were published recently, sorted based on recency. */
  Recent = 'RECENT',
  /** Returns posts based on old personalization algorithm. */
  Relevant = 'RELEVANT'
}

export enum HttpRedirectionType {
  /** A permanent redirect that corresponds to the 308 HTTP status code. */
  Permanent = 'PERMANENT',
  /** A temporary redirect that corresponds to the 307 HTTP status code. */
  Temporary = 'TEMPORARY'
}

/**
 * Contains basic information about the tag.
 * A tag is a label that categorizes posts with similar topics.
 */
export type ITag = {
  /** Total number of users following this tag. */
  followersCount: Scalars['Int']['output'];
  /** The ID of the tag. */
  id: Scalars['ID']['output'];
  /** Information about the tag. Contains markdown html and text version of the tag's info. */
  info?: Maybe<Content>;
  /** The logo of the tag. Shown in tag page. */
  logo?: Maybe<Scalars['String']['output']>;
  /** The name of the tag. Shown in tag page. */
  name: Scalars['String']['output'];
  /** Alltime usage count of this tag in posts. */
  postsCount: Scalars['Int']['output'];
  /** The slug of the tag. Used to access tags feed.  Example https://hashnode.com/n/graphql */
  slug: Scalars['String']['output'];
  /** The tagline of the tag. */
  tagline?: Maybe<Scalars['String']['output']>;
};

/** Basic information about a user on Hashnode. */
export type IUser = {
  /** Whether or not the user is an ambassador. */
  ambassador: Scalars['Boolean']['output'];
  /** The availability of the user based on tech stack and interests. Shown on the "I am available for" section in user's profile. */
  availableFor?: Maybe<Scalars['String']['output']>;
  /** Returns a list of badges that the user has earned. Shown on blogs /badges page. Example - https://iamshadmirza.com/badges */
  badges: Array<Badge>;
  /** The bio of the user. Visible in about me section of the user's profile. */
  bio?: Maybe<Content>;
  /** The date the user joined Hashnode. */
  dateJoined?: Maybe<Scalars['DateTime']['output']>;
  /** Whether or not the user is deactivated. */
  deactivated: Scalars['Boolean']['output'];
  /** The users who are following this user */
  followers: UserConnection;
  /** The number of users that follow the requested user. Visible in the user's profile. */
  followersCount: Scalars['Int']['output'];
  /** The number of users that this user is following. Visible in the user's profile. */
  followingsCount: Scalars['Int']['output'];
  /** The users which this user is following */
  follows: UserConnection;
  /** The ID of the user. It can be used to identify the user. */
  id: Scalars['ID']['output'];
  /** The location of the user. */
  location?: Maybe<Scalars['String']['output']>;
  /** The name of the user. */
  name: Scalars['String']['output'];
  /** Returns the list of posts the user has published. */
  posts: UserPostConnection;
  /** The URL to the profile picture of the user. */
  profilePicture?: Maybe<Scalars['String']['output']>;
  /** Publications associated with the user. Includes personal and team publications. */
  publications: UserPublicationsConnection;
  /** The social media links of the user. Shown on the user's profile. */
  socialMediaLinks?: Maybe<SocialMediaLinks>;
  /** The tagline of the user. Shown on the user's profile below the name. */
  tagline?: Maybe<Scalars['String']['output']>;
  /** Returns a list of tags that the user follows. */
  tagsFollowing: Array<Tag>;
  /** The username of the user. It is unique and tied with user's profile URL. Example - https://hashnode.com/@username */
  username: Scalars['String']['output'];
};


/** Basic information about a user on Hashnode. */
export type IUserFollowersArgs = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};


/** Basic information about a user on Hashnode. */
export type IUserFollowsArgs = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};


/** Basic information about a user on Hashnode. */
export type IUserPostsArgs = {
  filter?: InputMaybe<UserPostConnectionFilter>;
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  sortBy?: InputMaybe<UserPostsSort>;
};


/** Basic information about a user on Hashnode. */
export type IUserPublicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<UserPublicationsConnectionFilter>;
  first: Scalars['Int']['input'];
};

export type LikeCommentInput = {
  commentId: Scalars['ID']['input'];
  likesCount?: InputMaybe<Scalars['Int']['input']>;
};

export type LikeCommentPayload = {
  __typename?: 'LikeCommentPayload';
  comment?: Maybe<Comment>;
};

export type LikePostInput = {
  likesCount?: InputMaybe<Scalars['Int']['input']>;
  postId: Scalars['ID']['input'];
};

export type LikePostPayload = {
  __typename?: 'LikePostPayload';
  post?: Maybe<Post>;
};

/** Contains information about meta tags of the post. Used for SEO purpose. */
export type MetaTagsInput = {
  /** The description of the post used in og:description for SEO. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The image URL of the post used in og:image for SEO. */
  image?: InputMaybe<Scalars['String']['input']>;
  /** The title of the post used in og:title for SEO. */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Adds a comment to a post. */
  addComment: AddCommentPayload;
  /** Adds a post to a series. */
  addPostToSeries: AddPostToSeriesPayload;
  /** Adds a reply to a comment. */
  addReply: AddReplyPayload;
  cancelScheduledDraft: CancelScheduledDraftPayload;
  createWebhook: CreateWebhookPayload;
  deleteWebhook: DeleteWebhookPayload;
  /** Likes a comment. */
  likeComment: LikeCommentPayload;
  /** Likes a post. */
  likePost: LikePostPayload;
  /** Publishes an existing draft as a post. */
  publishDraft: PublishDraftPayload;
  /** Creates a new post. */
  publishPost: PublishPostPayload;
  recommendPublications: RecommendPublicationsPayload;
  /** Removes a comment from a post. */
  removeComment: RemoveCommentPayload;
  /** Removes a post. */
  removePost: RemovePostPayload;
  removeRecommendation: RemoveRecommendationPayload;
  /** Removes a reply from a comment. */
  removeReply: RemoveReplyPayload;
  /** Reschedule a draft. */
  rescheduleDraft: RescheduleDraftPayload;
  resendWebhookRequest: ResendWebhookRequestPayload;
  scheduleDraft: ScheduleDraftPayload;
  subscribeToNewsletter: SubscribeToNewsletterPayload;
  /**
   * Update the follow state for the user that is provided via id or username.
   * If the authenticated user does not follow the user, the mutation will follow the user.
   * If the authenticated user already follows the user, the mutation will un-follow the user.
   * Only available to the authenticated user.
   */
  toggleFollowUser: ToggleFollowUserPayload;
  triggerWebhookTest: TriggerWebhookTestPayload;
  unsubscribeFromNewsletter: UnsubscribeFromNewsletterPayload;
  /** Updates a comment on a post. */
  updateComment: UpdateCommentPayload;
  updatePost: UpdatePostPayload;
  /** Updates a reply */
  updateReply: UpdateReplyPayload;
  updateWebhook: UpdateWebhookPayload;
};


export type MutationAddCommentArgs = {
  input: AddCommentInput;
};


export type MutationAddPostToSeriesArgs = {
  input: AddPostToSeriesInput;
};


export type MutationAddReplyArgs = {
  input: AddReplyInput;
};


export type MutationCancelScheduledDraftArgs = {
  input: CancelScheduledDraftInput;
};


export type MutationCreateWebhookArgs = {
  input: CreateWebhookInput;
};


export type MutationDeleteWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLikeCommentArgs = {
  input: LikeCommentInput;
};


export type MutationLikePostArgs = {
  input: LikePostInput;
};


export type MutationPublishDraftArgs = {
  input: PublishDraftInput;
};


export type MutationPublishPostArgs = {
  input: PublishPostInput;
};


export type MutationRecommendPublicationsArgs = {
  input: RecommendPublicationsInput;
};


export type MutationRemoveCommentArgs = {
  input: RemoveCommentInput;
};


export type MutationRemovePostArgs = {
  input: RemovePostInput;
};


export type MutationRemoveRecommendationArgs = {
  input: RemoveRecommendationInput;
};


export type MutationRemoveReplyArgs = {
  input: RemoveReplyInput;
};


export type MutationRescheduleDraftArgs = {
  input: RescheduleDraftInput;
};


export type MutationResendWebhookRequestArgs = {
  input: ResendWebhookRequestInput;
};


export type MutationScheduleDraftArgs = {
  input: ScheduleDraftInput;
};


export type MutationSubscribeToNewsletterArgs = {
  input: SubscribeToNewsletterInput;
};


export type MutationToggleFollowUserArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};


export type MutationTriggerWebhookTestArgs = {
  input: TriggerWebhookTestInput;
};


export type MutationUnsubscribeFromNewsletterArgs = {
  input: UnsubscribeFromNewsletterInput;
};


export type MutationUpdateCommentArgs = {
  input: UpdateCommentInput;
};


export type MutationUpdatePostArgs = {
  input: UpdatePostInput;
};


export type MutationUpdateReplyArgs = {
  input: UpdateReplyInput;
};


export type MutationUpdateWebhookArgs = {
  input: UpdateWebhookInput;
};

/**
 * Basic information about the authenticated user.
 * User must be authenticated to use this type.
 */
export type MyUser = IUser & Node & {
  __typename?: 'MyUser';
  /**
   * Whether or not the user is an ambassador.
   * @deprecated Ambassadors program no longer active. Will be removed after 02/01/2024
   */
  ambassador: Scalars['Boolean']['output'];
  /** The availability of the user based on tech stack and interests. Shown on the "I am available for" section in user's profile. */
  availableFor?: Maybe<Scalars['String']['output']>;
  /** Returns a list of badges that the user has earned. Shown on blogs /badges page. Example - https://iamshadmirza.com/badges */
  badges: Array<Badge>;
  /** A list of beta features that the user has access to. Only available to the authenticated user. */
  betaFeatures: Array<BetaFeature>;
  /** The bio of the user. Visible in about me section of the user's profile. */
  bio?: Maybe<Content>;
  /** The date the user joined Hashnode. */
  dateJoined?: Maybe<Scalars['DateTime']['output']>;
  /** Whether or not the user is deactivated. */
  deactivated: Scalars['Boolean']['output'];
  /** Email address of the user. Only available to the authenticated user. */
  email?: Maybe<Scalars['String']['output']>;
  /** The users who are following this user */
  followers: UserConnection;
  /** The number of users that follow the requested user. Visible in the user's profile. */
  followersCount: Scalars['Int']['output'];
  /** The number of users that this user is following. Visible in the user's profile. */
  followingsCount: Scalars['Int']['output'];
  /** The users which this user is following */
  follows: UserConnection;
  /** The ID of the user. It can be used to identify the user. */
  id: Scalars['ID']['output'];
  /** The location of the user. */
  location?: Maybe<Scalars['String']['output']>;
  /** The name of the user. */
  name: Scalars['String']['output'];
  /** Returns the list of posts the user has published. */
  posts: UserPostConnection;
  /** The URL to the profile picture of the user. */
  profilePicture?: Maybe<Scalars['String']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
  /** Publications associated with the user. Includes personal and team publications. */
  publications: UserPublicationsConnection;
  /** The social media links of the user. Shown on the user's profile. */
  socialMediaLinks?: Maybe<SocialMediaLinks>;
  /** The tagline of the user. Shown on the user's profile below the name. */
  tagline?: Maybe<Scalars['String']['output']>;
  /** Returns a list of tags that the user follows. */
  tagsFollowing: Array<Tag>;
  /** Hashnode users are subscribed to a newsletter by default. This field can be used to unsubscribe from the newsletter. Only available to the authenticated user. */
  unsubscribeCode?: Maybe<Scalars['String']['output']>;
  /** The username of the user. It is unique and tied with user's profile URL. Example - https://hashnode.com/@username */
  username: Scalars['String']['output'];
};


/**
 * Basic information about the authenticated user.
 * User must be authenticated to use this type.
 */
export type MyUserFollowersArgs = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};


/**
 * Basic information about the authenticated user.
 * User must be authenticated to use this type.
 */
export type MyUserFollowsArgs = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};


/**
 * Basic information about the authenticated user.
 * User must be authenticated to use this type.
 */
export type MyUserPostsArgs = {
  filter?: InputMaybe<UserPostConnectionFilter>;
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  sortBy?: InputMaybe<UserPostsSort>;
};


/**
 * Basic information about the authenticated user.
 * User must be authenticated to use this type.
 */
export type MyUserPublicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<UserPublicationsConnectionFilter>;
  first: Scalars['Int']['input'];
};

/**
 * Contains the flag indicating if the newsletter feature is enabled or not.
 * User can enable or disable the newsletter feature from the publication settings.
 * Shows a newsletter prompt on blog if enabled.
 */
export type NewsletterFeature = Feature & {
  __typename?: 'NewsletterFeature';
  frequency?: Maybe<NewsletterFrequency>;
  /** A flag indicating if the newsletter feature is enabled or not. */
  isEnabled: Scalars['Boolean']['output'];
};

export enum NewsletterFrequency {
  Asap = 'asap',
  Weekly = 'weekly'
}

export enum NewsletterSubscribeStatus {
  Pending = 'PENDING'
}

export enum NewsletterUnsubscribeStatus {
  Unsubscribed = 'UNSUBSCRIBED'
}

/** Node is a common interface for all types example User, Post, Comment, etc. */
export type Node = {
  /** The ID of the node. */
  id: Scalars['ID']['output'];
};

/** Contains information to help in pagination for page based pagination. */
export type OffsetPageInfo = {
  __typename?: 'OffsetPageInfo';
  /** Indicates if there are more pages. */
  hasNextPage?: Maybe<Scalars['Boolean']['output']>;
  /** Indicates if there are previous pages */
  hasPreviousPage?: Maybe<Scalars['Boolean']['output']>;
  /**
   * The page after the current page.
   * Use it to build page navigation
   */
  nextPage?: Maybe<Scalars['Int']['output']>;
  /**
   * The page before the current page.
   * Use it to build page navigation
   */
  previousPage?: Maybe<Scalars['Int']['output']>;
};

/** Information to help in open graph related meta tags. */
export type OpenGraphMetaData = {
  __typename?: 'OpenGraphMetaData';
  /** The image used in og:image tag for SEO purposes. */
  image?: Maybe<Scalars['String']['output']>;
};

/**
 * A Connection for page based pagination to get a list of items.
 * Returns a list of nodes which contains the items.
 * This is a common interface for all page connections.
 */
export type PageConnection = {
  /** A list of edges of items connection. */
  nodes: Array<Node>;
  /** Information to aid in pagination. */
  pageInfo: OffsetPageInfo;
};

/** Contains information to help in pagination. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /**
   * The cursor of the last item in the current page.
   * Use it as the after input to query the next page.
   */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Indicates if there are more pages. */
  hasNextPage?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * Contains the preferences publication's autogenerated pages.
 * Used to enable or disable pages like badge, newsletter and members.
 */
export type PagesPreferences = {
  __typename?: 'PagesPreferences';
  /** A flag indicating if the publication's badge page is enabled. */
  badges?: Maybe<Scalars['Boolean']['output']>;
  /** A flag indicating if the publication's member page is enabled. */
  members?: Maybe<Scalars['Boolean']['output']>;
  /** A flag indicating if the publication's newsletter page is enabled. */
  newsletter?: Maybe<Scalars['Boolean']['output']>;
};

/** Contains basic information about the tag returned by popularTags query. */
export type PopularTag = ITag & Node & {
  __typename?: 'PopularTag';
  /** Total number of users following this tag. */
  followersCount: Scalars['Int']['output'];
  /** The ID of the tag. */
  id: Scalars['ID']['output'];
  /** Information about the tag. Contains markdown html and text version of the tag's info. */
  info?: Maybe<Content>;
  /** The logo of the tag. Shown in tag page. */
  logo?: Maybe<Scalars['String']['output']>;
  /** The name of the tag. Shown in tag page. */
  name: Scalars['String']['output'];
  /** Alltime usage count of this tag in posts. */
  postsCount: Scalars['Int']['output'];
  /** The number of posts published in the given period that use this tag. */
  postsCountInPeriod: Scalars['Int']['output'];
  /** The slug of the tag. Used to access tags feed.  Example https://hashnode.com/n/graphql */
  slug: Scalars['String']['output'];
  /** The tagline of the tag. */
  tagline?: Maybe<Scalars['String']['output']>;
};

/** Contains a tag and a cursor for pagination. */
export type PopularTagEdge = Edge & {
  __typename?: 'PopularTagEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The node holding the Tag information */
  node: PopularTag;
};

/**
 * Contains basic information about the post.
 * A post is a published article on Hashnode.
 */
export type Post = Node & {
  __typename?: 'Post';
  /** Returns male and female audio url of the post. Available in case the Audioblog is enabled. */
  audioUrls?: Maybe<AudioUrls>;
  /** Returns the user details of the author of the post. */
  author: User;
  /**
   * Flag to indicate if the post is bookmarked by the requesting user.
   *
   * Returns `false` if the user is not authenticated.
   */
  bookmarked: Scalars['Boolean']['output'];
  /** Brief is a short description of the post extracted from the content of the post. It's 250 characters long sanitized string. */
  brief: Scalars['String']['output'];
  /** Canonical URL set by author in case of republished posts. */
  canonicalUrl?: Maybe<Scalars['String']['output']>;
  /**
   * Returns the user details of the co-authors of the post.
   * Hashnode users can add up to 4 co-authors as collaborators to their posts.
   * This functionality is limited to teams publication.
   */
  coAuthors?: Maybe<Array<User>>;
  /** List of users who have commented on the post. */
  commenters: PostCommenterConnection;
  /** A list of comments on the post. */
  comments: PostCommentConnection;
  /** Content of the post. Contains HTML and Markdown version of the post content. */
  content: Content;
  /**
   * A list of contributors of the post. Contributors are users who have commented or replied to the post.
   * @deprecated Will be removed on 10th Oct 2023. Use `commenters` instead.
   */
  contributors: Array<User>;
  /** The cover image preference of the post. Contains cover image URL and other details. */
  coverImage?: Maybe<PostCoverImage>;
  /** Unique ID to identify post, used internally by hashnode. */
  cuid?: Maybe<Scalars['String']['output']>;
  /** Flag to indicate if the post is featured on Hashnode feed. */
  featured: Scalars['Boolean']['output'];
  /** The date and time the post was featured. Used along with featured flag to determine if the post is featured. */
  featuredAt?: Maybe<Scalars['DateTime']['output']>;
  /** Post feature-related fields. */
  features: PostFeatures;
  /** A flag to indicate if the post contains LaTeX. Latex is used to write mathematical equations. */
  hasLatexInPost: Scalars['Boolean']['output'];
  /** The ID of the post. Used to uniquely identify the post. */
  id: Scalars['ID']['output'];
  /** Wether or not the post has automatically been published via RSS feed. */
  isAutoPublishedFromRSS: Scalars['Boolean']['output'];
  /**
   * Wether or not the authenticated user is following this post.
   *
   * Returns `null` if the user is not authenticated.
   */
  isFollowed?: Maybe<Scalars['Boolean']['output']>;
  /** A list of users who liked the post. */
  likedBy: PostLikerConnection;
  /** OG meta-data of the post. Contains image url used in open graph meta tags. */
  ogMetaData?: Maybe<OpenGraphMetaData>;
  /** Preference settings for the post. Contains information about if the post is pinned to blog, comments are disabled, etc. */
  preferences: PostPreferences;
  /** The publication the post belongs to. */
  publication?: Maybe<Publication>;
  /** The date and time the post was published. */
  publishedAt: Scalars['DateTime']['output'];
  /** The number of hearts on the post. Shows how many users liked the post. */
  reactionCount: Scalars['Int']['output'];
  /** The estimated time to read the post in minutes. */
  readTimeInMinutes: Scalars['Int']['output'];
  /** The number of replies on the post. */
  replyCount: Scalars['Int']['output'];
  /** The number of comments on the post. */
  responseCount: Scalars['Int']['output'];
  /** SEO information of the post. Contains title and description used in meta tags. */
  seo?: Maybe<Seo>;
  /** Information of the series the post belongs to. */
  series?: Maybe<Series>;
  /** The slug of the post. Used as address of the post on blog. Example - https://johndoe.com/my-post-slug */
  slug: Scalars['String']['output'];
  /** The subtitle of the post. Subtitle is a short description of the post which is also used in SEO if meta tags are not provided. */
  subtitle?: Maybe<Scalars['String']['output']>;
  /** Returns list of tags added to the post. Contains tag id, name, slug, etc. */
  tags?: Maybe<Array<Tag>>;
  /** The title of the post. */
  title: Scalars['String']['output'];
  /** The date and time the post was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Complete URL of the post including the domain name. Example - https://johndoe.com/my-post-slug */
  url: Scalars['String']['output'];
  /** The number of views on the post. Can be used to show the popularity of the post. */
  views: Scalars['Int']['output'];
};


/**
 * Contains basic information about the post.
 * A post is a published article on Hashnode.
 */
export type PostCommentersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  sortBy?: InputMaybe<PostCommenterSortBy>;
};


/**
 * Contains basic information about the post.
 * A post is a published article on Hashnode.
 */
export type PostCommentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  sortBy?: InputMaybe<PostCommentSortBy>;
};


/**
 * Contains basic information about the post.
 * A post is a published article on Hashnode.
 */
export type PostLikedByArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PostLikerFilter>;
  first: Scalars['Int']['input'];
};

/** The author type of a post from a user's perspective */
export enum PostAuthorType {
  /** The user has authored the post. */
  Author = 'AUTHOR',
  /** The user is a co-author of post. */
  CoAuthor = 'CO_AUTHOR'
}

export type PostBadge = Node & {
  __typename?: 'PostBadge';
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** The type of the badge. */
  type: PostBadgeType;
};

export enum PostBadgeType {
  FeaturedDailyDotDev = 'FEATURED_DAILY_DOT_DEV',
  FeaturedHashnode = 'FEATURED_HASHNODE'
}

export type PostBadgesFeature = Feature & {
  __typename?: 'PostBadgesFeature';
  /** Wether or not the user has chosen to show badges on the post. */
  isEnabled: Scalars['Boolean']['output'];
  items: Array<PostBadge>;
};

/**
 * Connection for comments. Contains a list of edges containing nodes.
 * Each node holds a comment.
 * Page info contains information about pagination like hasNextPage and endCursor.
 * Total documents contains the total number of comments.
 */
export type PostCommentConnection = Connection & {
  __typename?: 'PostCommentConnection';
  /** A list of edges containing comments as nodes. */
  edges: Array<PostCommentEdge>;
  /** Information about pagination in a connection. */
  pageInfo: PageInfo;
  /** Total number of nodes available i.e. number of comments. */
  totalDocuments: Scalars['Int']['output'];
};

/** A comment on the post. Contains information about the content of the comment, user who commented, etc. */
export type PostCommentEdge = Edge & {
  __typename?: 'PostCommentEdge';
  /** The cursor for this node used for pagination. */
  cursor: Scalars['String']['output'];
  /** The comment on the post. */
  node: Comment;
};

/** Sorting options for comments. Used to sort comments by top or recent. */
export enum PostCommentSortBy {
  /** Sorts comments by recency. */
  Recent = 'RECENT',
  /** Sorts comments by popularity. */
  Top = 'TOP'
}

/**
 * Connection for commenters (users). Contains a list of edges containing nodes.
 * Each node holds commenter.
 * Page info contains information about pagination like hasNextPage and endCursor.
 * Total documents contains the total number of commenters.
 */
export type PostCommenterConnection = Connection & {
  __typename?: 'PostCommenterConnection';
  /** A list of edges containing commenters as nodes. */
  edges: Array<PostCommenterEdge>;
  /** Information about pagination in a connection. */
  pageInfo: PageInfo;
  /** Total number of nodes available i.e. number of commenters. */
  totalDocuments: Scalars['Int']['output'];
};

/** A commenter on the post. Contains information about the user who commented. */
export type PostCommenterEdge = Edge & {
  __typename?: 'PostCommenterEdge';
  /** The cursor for this node used for pagination. */
  cursor: Scalars['String']['output'];
  /** The commenter on the post. */
  node: User;
};

/** Sorting options for commenters. Used to sort commenters by popularity or recency. */
export enum PostCommenterSortBy {
  /** Sorts commenters by popularity. */
  Popular = 'POPULAR',
  /** Sorts commenters by recency. */
  Recent = 'RECENT'
}

/** Contains information about the cover image of the post. */
export type PostCoverImage = {
  __typename?: 'PostCoverImage';
  /** Provides attribution information for the cover image, if available. */
  attribution?: Maybe<Scalars['String']['output']>;
  /** True if the image attribution should be hidden. */
  isAttributionHidden: Scalars['Boolean']['output'];
  /** Indicates whether the cover image is in portrait orientation. */
  isPortrait: Scalars['Boolean']['output'];
  /** The name of the photographer who captured the cover image. */
  photographer?: Maybe<Scalars['String']['output']>;
  /** The URL of the cover image. */
  url: Scalars['String']['output'];
};

/** Contains a post and a cursor for pagination. */
export type PostEdge = Edge & {
  __typename?: 'PostEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The node holding the Post information */
  node: Post;
};

export type PostFeatures = {
  __typename?: 'PostFeatures';
  badges: PostBadgesFeature;
  tableOfContents: TableOfContentsFeature;
};

/**
 * Connection for users who liked the post. Contains a list of edges containing nodes.
 * Each node is a user who liked the post.
 * Page info contains information about pagination like hasNextPage and endCursor.
 * Total documents contains the total number of users who liked the post.
 */
export type PostLikerConnection = Connection & {
  __typename?: 'PostLikerConnection';
  /** A list of edges containing users as nodes */
  edges: Array<PostLikerEdge>;
  /** Information about pagination in a connection. */
  pageInfo: PageInfo;
  /** Total number of nodes available i.e. number of users who liked the post. */
  totalDocuments: Scalars['Int']['output'];
};

/** A user who liked the post. Contains information about the user and number of reactions added by the user. */
export type PostLikerEdge = Edge & {
  __typename?: 'PostLikerEdge';
  /** The cursor for this node used for pagination. */
  cursor: Scalars['String']['output'];
  /** The user who liked the post. */
  node: User;
  /** The number of reaction added by the user. */
  reactionCount: Scalars['Int']['output'];
};

export type PostLikerFilter = {
  /** Only return likes from users with the given user IDs. */
  userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Contains Post preferences. Used to determine if the post is pinned to blog, comments are disabled, or cover image is sticked to bottom. */
export type PostPreferences = {
  __typename?: 'PostPreferences';
  /** A flag to indicate if the comments are disabled for the post. */
  disableComments: Scalars['Boolean']['output'];
  /** Wether or not the post is hidden from the Hashnode community. */
  isDelisted: Scalars['Boolean']['output'];
  /** A flag to indicate if the post is pinned to blog. Pinned post is shown on top of the blog. */
  pinnedToBlog: Scalars['Boolean']['output'];
  /** A flag to indicate if the cover image is shown below title of the post. Default position of cover is top of title. */
  stickCoverToBottom: Scalars['Boolean']['output'];
};

/** Contains the publication's preferences for layout, theme and other personalisations. */
export type Preferences = {
  __typename?: 'Preferences';
  /** The publication's darkmode preferences. Can be used to load blog in dark mode by default and add a custom dark mode logo. */
  darkMode?: Maybe<DarkModePreferences>;
  /** A flag indicating if the hashnode's footer branding is disabled for the publication. */
  disableFooterBranding?: Maybe<Scalars['Boolean']['output']>;
  /** An object containing pages enabled for the publication. */
  enabledPages?: Maybe<PagesPreferences>;
  /** A flag indicating if subscription popup needs to be shown to be shown for the publication */
  isSubscriptionModalDisabled?: Maybe<Scalars['Boolean']['output']>;
  /** The selected publication's layout, can be stacked, grid or magazine. */
  layout?: Maybe<PublicationLayout>;
  /** The publication's logo url. */
  logo?: Maybe<Scalars['String']['output']>;
  /** The items in the publication's navigation bar. */
  navbarItems: Array<PublicationNavbarItem>;
};

/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type Publication = Node & {
  __typename?: 'Publication';
  /** The about section of the publication. */
  about?: Maybe<Content>;
  /** The author who owns the publication. */
  author: User;
  /** The canonical URL of the publication. */
  canonicalURL: Scalars['String']['output'];
  /** The description of the publication, used in og:description meta tag. Fall backs to Publication.about.text if no SEO description is provided. */
  descriptionSEO?: Maybe<Scalars['String']['output']>;
  /** The title of the publication. Shown in blog home page. */
  displayTitle?: Maybe<Scalars['String']['output']>;
  /** Domain information of the publication. */
  domainInfo: DomainInfo;
  /** Returns the list of drafts in the publication. */
  drafts: DraftConnection;
  /** Returns the publication's email imports, used with newsletter feature. */
  emailImport?: Maybe<EmailImport>;
  /** The favicon of the publication. Used in browser tab. */
  favicon?: Maybe<Scalars['String']['output']>;
  /** Object containing information about beta features enabled for the publication. */
  features: PublicationFeatures;
  /** Total number of followers of the publication. */
  followersCount?: Maybe<Scalars['Int']['output']>;
  /** Whether the publication has earned any badges or not. */
  hasBadges: Scalars['Boolean']['output'];
  /** Color code of the header color of the publication. Used to style header of blog. */
  headerColor?: Maybe<Scalars['String']['output']>;
  /** The ID of the publication. */
  id: Scalars['ID']['output'];
  /**
   * Summary of the contact information and information related to copyrights, usually used in German-speaking countries.
   * @deprecated Use `imprintV2` instead. Will be removed after 16/12/2023.
   */
  imprint?: Maybe<Scalars['String']['output']>;
  /** Summary of the contact information and information related to copyrights, usually used in German-speaking countries. */
  imprintV2?: Maybe<Content>;
  /** The integrations connected to the publication. */
  integrations?: Maybe<PublicationIntegrations>;
  /** Returns true if GitHub backup is configured and active and false otherwise. */
  isGitHubBackupEnabled: Scalars['Boolean']['output'];
  /** A flag to indicate if the publication is using Headless CMS. This can be used to check if the post redirect needs authentication. */
  isHeadless: Scalars['Boolean']['output'];
  /** True if the publication is a team publication and false otherwise. */
  isTeam: Scalars['Boolean']['output'];
  /** Links to the publication's social media profiles. */
  links?: Maybe<PublicationLinks>;
  /** The meta tags associated with the publication. */
  metaTags?: Maybe<Scalars['String']['output']>;
  /** Information about the publication's Open Graph metadata i.e. image. */
  ogMetaData: OpenGraphMetaData;
  /** Returns the pinned post of the publication. */
  pinnedPost?: Maybe<Post>;
  /** Returns the post with the given slug. */
  post?: Maybe<Post>;
  /** Returns the list of posts in the publication. */
  posts: PublicationPostConnection;
  /** The publication preferences around layout, theme and other personalisations. */
  preferences: Preferences;
  /** Publications that are recommended by this publication. */
  recommendedPublications: Array<UserRecommendedPublicationEdge>;
  /** Publications that are recommending this publication. */
  recommendingPublications: PublicationUserRecommendingPublicationConnection;
  /** Configured redirection rules for the publication. */
  redirectionRules: Array<RedirectionRule>;
  /** Returns the scheduled drafts of the publication. */
  scheduledDrafts: DraftConnection;
  /** Returns series by slug in the publication. */
  series?: Maybe<Series>;
  /** Returns the list of series in the publication. */
  seriesList: SeriesConnection;
  /** Contains the publication's sponsorships information. */
  sponsorship?: Maybe<PublicationSponsorship>;
  /** Returns the static page with the given slug. */
  staticPage?: Maybe<StaticPage>;
  /** Returns a list of static pages in the publication. */
  staticPages: StaticPageConnection;
  /** Returns the list of submitted drafts in the publication. */
  submittedDrafts: DraftConnection;
  /**
   * The title of the publication.
   * Title is used as logo if logo is not provided.
   */
  title: Scalars['String']['output'];
  /** The total amount of recommended publications by this publication. */
  totalRecommendedPublications: Scalars['Int']['output'];
  /** The domain of the publication. Used to access publication. Example https://johndoe.com */
  url: Scalars['String']['output'];
  /** Determines the structure of the post URLs. */
  urlPattern: UrlPattern;
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationDraftsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PublicationDraftConnectionFilter>;
  first: Scalars['Int']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationPostArgs = {
  slug: Scalars['String']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PublicationPostConnectionFilter>;
  first: Scalars['Int']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationRecommendingPublicationsArgs = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationScheduledDraftsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PublicationDraftConnectionFilter>;
  first: Scalars['Int']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationSeriesArgs = {
  slug: Scalars['String']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationSeriesListArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationStaticPageArgs = {
  slug: Scalars['String']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationStaticPagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
};


/**
 * Contains basic information about the publication.
 * A publication is a blog that can be created for a user or a team.
 */
export type PublicationSubmittedDraftsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PublicationDraftConnectionFilter>;
  first: Scalars['Int']['input'];
};

/**
 * Connection to get list of drafts in publications.
 * Returns a list of edges which contains the drafts in publication and cursor to the last item of the previous page.
 */
export type PublicationDraftConnectionFilter = {
  /** Search filter will be applied to the title of a draft */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Contains the publication's beta features. */
export type PublicationFeatures = {
  __typename?: 'PublicationFeatures';
  /** Audio player for blog posts. */
  audioBlog: AudioBlogFeature;
  /** Individual styling for the publication. */
  customCSS: CustomCssFeature;
  /** Newsletter feature for the publication which adds a `/newsletter` route for collecting subscribers and allows sending out newsletters. */
  newsletter: NewsletterFeature;
  /** Show the read time for blog posts. */
  readTime: ReadTimeFeature;
  /** Widget that shows up if a text on a blog post is selected. Allows for easy sharing or copying of the selected text. */
  textSelectionSharer: TextSelectionSharerFeature;
  /** Show the view count for blog posts. */
  viewCount: ViewCountFeature;
};

/**
 * Contains the publication's integrations.
 * Used to connect the publication with third party services like Google Analytics, Facebook Pixel, etc.
 */
export type PublicationIntegrations = {
  __typename?: 'PublicationIntegrations';
  /** Custom domain for integration with Fathom Analytics. */
  fathomCustomDomain?: Maybe<Scalars['String']['output']>;
  /** A flag indicating if the custom domain is enabled for integration with Fathom Analytics. */
  fathomCustomDomainEnabled?: Maybe<Scalars['Boolean']['output']>;
  /** Fathom Analytics Site ID for integration with Fathom Analytics. */
  fathomSiteID?: Maybe<Scalars['String']['output']>;
  /** FB Pixel ID for integration with Facebook Pixel. */
  fbPixelID?: Maybe<Scalars['String']['output']>;
  /** Google Tag Manager ID for integration with Google Tag Manager. */
  gTagManagerID?: Maybe<Scalars['String']['output']>;
  /** Google Analytics Tracking ID for integration with Google Analytics. */
  gaTrackingID?: Maybe<Scalars['String']['output']>;
  /** Hotjar Site ID for integration with Hotjar. */
  hotjarSiteID?: Maybe<Scalars['String']['output']>;
  /** Matomo Site ID for integration with Matomo Analytics. */
  matomoSiteID?: Maybe<Scalars['String']['output']>;
  /** Matomo URL for integration with Matomo Analytics. */
  matomoURL?: Maybe<Scalars['String']['output']>;
  /** A flag indicating if the custom domain is enabled for integration with Plausible Analytics. */
  plausibleAnalyticsEnabled?: Maybe<Scalars['Boolean']['output']>;
  /** The ID for the Hashnode-provided Umami analytics instance. */
  umamiWebsiteUUID?: Maybe<Scalars['String']['output']>;
  /** Web Monetization Payment Pointer for integration with Web Monetization. */
  wmPaymentPointer?: Maybe<Scalars['String']['output']>;
};

/** Contains publication's layout choices. */
export enum PublicationLayout {
  /** Changes the layout of blog into grid 3 post cards per row. */
  Grid = 'grid',
  /**
   * Changes the layout of blog into magazine style.
   * This is the newest layout.
   */
  Magazine = 'magazine',
  /** Changes the layout of blog into stacked list of posts. */
  Stacked = 'stacked'
}

/** Contains the publication's social media links. */
export type PublicationLinks = {
  __typename?: 'PublicationLinks';
  /** Daily.dev URL of the publication. */
  dailydev?: Maybe<Scalars['String']['output']>;
  /** GitHub URL of the publication. */
  github?: Maybe<Scalars['String']['output']>;
  /** Hashnode profile of author of the publication. */
  hashnode?: Maybe<Scalars['String']['output']>;
  /** Instagram URL of the publication. */
  instagram?: Maybe<Scalars['String']['output']>;
  /** LinkedIn URL of the publication. */
  linkedin?: Maybe<Scalars['String']['output']>;
  /** Mastodon URL of the publication. */
  mastodon?: Maybe<Scalars['String']['output']>;
  /** Twitter URL of the publication. */
  twitter?: Maybe<Scalars['String']['output']>;
  /** Website URL of the publication. */
  website?: Maybe<Scalars['String']['output']>;
  /** YouTube URL of the publication. */
  youtube?: Maybe<Scalars['String']['output']>;
};

/** Contains the publication's navbar items. */
export type PublicationNavbarItem = {
  __typename?: 'PublicationNavbarItem';
  /** The unique identifier of the navbar item. */
  id: Scalars['ID']['output'];
  /** The label of the navbar item. */
  label?: Maybe<Scalars['String']['output']>;
  /** The static page added to the navbar item. */
  page?: Maybe<StaticPage>;
  /** The order of the navbar item. */
  priority?: Maybe<Scalars['Int']['output']>;
  /** The series added to the navbar item. */
  series?: Maybe<Series>;
  /** The type of the navbar item, can be series, link or page. */
  type: PublicationNavigationType;
  /** The URL of the navbar item. */
  url?: Maybe<Scalars['String']['output']>;
};

/** The type of the navbar item, can be series, link or page. */
export enum PublicationNavigationType {
  /** The navbar item is a link. */
  Link = 'link',
  /** The navbar item is a static page. */
  Page = 'page',
  /** The navbar item is a series. */
  Series = 'series'
}

/**
 * Connection for posts within a publication. Contains a list of edges containing nodes.
 * Each node is a post.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type PublicationPostConnection = Connection & {
  __typename?: 'PublicationPostConnection';
  /** A list of edges containing Post information */
  edges: Array<PostEdge>;
  /** Information for pagination in Post connection. */
  pageInfo: PageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/**
 * Connection to get list of posts in publications.
 * Returns a list of edges which contains the posts in publication and cursor to the last item of the previous page.
 */
export type PublicationPostConnectionFilter = {
  /** Remove pinned post from the result set. */
  excludePinnedPost?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * Filtering by tag slugs and tag IDs will return posts that match either of the filters.
   *
   * It is an "OR" filter and not an "AND" filter.
   */
  tagSlugs?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * Filtering by tag slugs and tag IDs will return posts that match either of the filters.
   *
   * It is an "OR" filter and not an "AND" filter.
   */
  tags?: InputMaybe<Array<Scalars['ObjectId']['input']>>;
};

/**
 * Contains the publication's Sponsorship information.
 * User can sponsor their favorite publications and pay them directly using Stripe.
 */
export type PublicationSponsorship = {
  __typename?: 'PublicationSponsorship';
  /**
   * The content shared by author of the publication to their sponsors.
   * This is used as note to inform that author is open for sponsorship.
   */
  content?: Maybe<Content>;
  /** The Stripe configuration of the publication's Sponsorship. */
  stripe?: Maybe<StripeConfiguration>;
};

export type PublicationUserRecommendingPublicationConnection = PageConnection & {
  __typename?: 'PublicationUserRecommendingPublicationConnection';
  /** A list of edges containing Post information */
  edges: Array<UserRecommendingPublicationEdge>;
  /** Publications recommending this publication. */
  nodes: Array<Publication>;
  /** Information for page based pagination in Post connection. */
  pageInfo: OffsetPageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

export type PublishDraftInput = {
  /** The id of the draft that should be published */
  draftId: Scalars['ObjectId']['input'];
};

export type PublishDraftPayload = {
  __typename?: 'PublishDraftPayload';
  /** The newly created post based on the draft */
  post?: Maybe<Post>;
};

/** Contains information about the post to be published. */
export type PublishPostInput = {
  /** Ids of the co-authors of the post. */
  coAuthors?: InputMaybe<Array<Scalars['ObjectId']['input']>>;
  /** Content of the post in markdown format. */
  contentMarkdown: Scalars['String']['input'];
  /** Options for the cover image of the post. */
  coverImageOptions?: InputMaybe<CoverImageOptionsInput>;
  /** A flag to indicate if the comments are disabled for the post. */
  disableComments?: InputMaybe<Scalars['Boolean']['input']>;
  /** Information about the meta tags added to the post, used for SEO purpose. */
  metaTags?: InputMaybe<MetaTagsInput>;
  /** The URL of the original article if the post is imported from an external source. */
  originalArticleURL?: InputMaybe<Scalars['String']['input']>;
  /** The ID of publication the post belongs to. */
  publicationId: Scalars['ObjectId']['input'];
  /**
   * Publish the post on behalf of another user who is a member of the publication.
   *
   * Only applicable for team publications.
   */
  publishAs?: InputMaybe<Scalars['ObjectId']['input']>;
  /** Date when the post is published. */
  publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Providing a seriesId will add the post to that series. */
  seriesId?: InputMaybe<Scalars['ObjectId']['input']>;
  /** Settings for the post like table of contents and newsletter activation. */
  settings?: InputMaybe<PublishPostSettingsInput>;
  /** Slug of the post. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** The subtitle of the post. */
  subtitle?: InputMaybe<Scalars['String']['input']>;
  /** A list of tags added to the post. */
  tags: Array<PublishPostTagInput>;
  /** The title of the post. */
  title: Scalars['String']['input'];
};

export type PublishPostPayload = {
  __typename?: 'PublishPostPayload';
  post?: Maybe<Post>;
};

export type PublishPostSettingsInput = {
  /** A flag to indicate if the post is delisted, used to hide the post from public feed. */
  delisted?: InputMaybe<Scalars['Boolean']['input']>;
  /** A flag to indicate if the post contains table of content */
  enableTableOfContent?: InputMaybe<Scalars['Boolean']['input']>;
  /** Wether to send a newsletter for this post. */
  isNewsletterActivated?: InputMaybe<Scalars['Boolean']['input']>;
  /** A flag to indicate if the post is scheduled. */
  scheduled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Flag to indicate if the slug is overridden by the user. */
  slugOverridden?: InputMaybe<Scalars['Boolean']['input']>;
};

export type PublishPostTagInput = {
  /**
   * A tag id that is referencing an existing tag.
   *
   * Either this or name and slug should be provided. If both are provided, the id will be used.
   */
  id?: InputMaybe<Scalars['ObjectId']['input']>;
  /**
   * A name of a new tag to create.
   *
   * Either this and slug or id should be provided. If both are provided, the id will be used.
   */
  name?: InputMaybe<Scalars['String']['input']>;
  /**
   * A slug of a new tag to create.
   *
   * Either this and name or id should be provided. If both are provided, the id will be used.
   */
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  /**
   * Returns a draft by ID.
   * Draft is a post that is not published yet.
   */
  draft?: Maybe<Draft>;
  /**
   * Returns a paginated list of posts based on the provided filter.
   * Used in Hashnode home feed.
   */
  feed: FeedPostConnection;
  /** Returns the current authenticated user. Only available to the authenticated user. */
  me: MyUser;
  /** Returns post by ID. Can be used to render post page on blog. */
  post?: Maybe<Post>;
  /**
   * Returns the publication with the given ID or host.
   * User can pass anyone of them.
   */
  publication?: Maybe<Publication>;
  /** Get a scheduled post by ID. */
  scheduledPost?: Maybe<ScheduledPost>;
  /** Returns a paginated list of posts based on search query for a particular publication id. */
  searchPostsOfPublication: SearchPostConnection;
  /** Returns tag details by its slug. */
  tag?: Maybe<Tag>;
  /** Returns users who have most actively participated in discussions by commenting in the last 7 days. */
  topCommenters: CommenterUserConnection;
  /** Returns the user with the username. */
  user?: Maybe<User>;
};


export type QueryDraftArgs = {
  id: Scalars['ObjectId']['input'];
};


export type QueryFeedArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<FeedFilter>;
  first: Scalars['Int']['input'];
};


export type QueryPostArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPublicationArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ObjectId']['input']>;
};


export type QueryScheduledPostArgs = {
  id?: InputMaybe<Scalars['ObjectId']['input']>;
};


export type QuerySearchPostsOfPublicationArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter: SearchPostsOfPublicationFilter;
  first: Scalars['Int']['input'];
};


export type QueryTagArgs = {
  slug: Scalars['String']['input'];
};


export type QueryTopCommentersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
};


export type QueryUserArgs = {
  username: Scalars['String']['input'];
};

export type RssImport = Node & {
  __typename?: 'RSSImport';
  id: Scalars['ID']['output'];
  /** The URL pointing to the RSS feed. */
  rssURL: Scalars['String']['output'];
};

/**
 * Contains the flag indicating if the read time feature is enabled or not.
 * User can enable or disable the read time feature from the publication settings.
 * Shows read time on blogs if enabled.
 */
export type ReadTimeFeature = Feature & {
  __typename?: 'ReadTimeFeature';
  /** A flag indicating if the read time feature is enabled or not. */
  isEnabled: Scalars['Boolean']['output'];
};

export type RecommendPublicationsInput = {
  recommendedPublicationIds: Array<Scalars['ID']['input']>;
  recommendingPublicationId: Scalars['ID']['input'];
};

export type RecommendPublicationsPayload = {
  __typename?: 'RecommendPublicationsPayload';
  recommendedPublications?: Maybe<Array<UserRecommendedPublicationEdge>>;
};

/** Contains a publication and a cursor for pagination. */
export type RecommendedPublicationEdge = Edge & {
  __typename?: 'RecommendedPublicationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The node holding the Publication information */
  node: Publication;
};

export type RedirectionRule = {
  __typename?: 'RedirectionRule';
  /** The destination URL of the redirection rule. */
  destination: Scalars['String']['output'];
  /** The source URL of the redirection rule. */
  source: Scalars['String']['output'];
  /** The type of the redirection rule. */
  type: HttpRedirectionType;
};

export type RemoveCommentInput = {
  id: Scalars['ID']['input'];
};

export type RemoveCommentPayload = {
  __typename?: 'RemoveCommentPayload';
  comment?: Maybe<Comment>;
};

export type RemovePostInput = {
  /** The ID of the post to remove. */
  id: Scalars['ID']['input'];
};

export type RemovePostPayload = {
  __typename?: 'RemovePostPayload';
  /** The deleted post. */
  post?: Maybe<Post>;
};

export type RemoveRecommendationInput = {
  recommendedPublicationId: Scalars['ID']['input'];
  recommendingPublicationId: Scalars['ID']['input'];
};

export type RemoveRecommendationPayload = {
  __typename?: 'RemoveRecommendationPayload';
  recommendedPublication: Publication;
};

export type RemoveReplyInput = {
  commentId: Scalars['ID']['input'];
  replyId: Scalars['ID']['input'];
};

export type RemoveReplyPayload = {
  __typename?: 'RemoveReplyPayload';
  reply?: Maybe<Reply>;
};

/**
 * Contains basic information about the reply.
 * A reply is a response to a comment.
 */
export type Reply = Node & {
  __typename?: 'Reply';
  /** The author of the reply. */
  author: User;
  /** The content of the reply in markdown and html format. */
  content: Content;
  /** The date the reply was created. */
  dateAdded: Scalars['DateTime']['output'];
  /** The ID of the reply. */
  id: Scalars['ID']['output'];
  /** Total number of reactions on the reply by the authenticated user. User must be authenticated to use this field. */
  myTotalReactions: Scalars['Int']['output'];
  /**
   * A unique string identifying the reply. Used as element id in the DOM on hashnode blogs.
   * It can be used to scroll to the reply in browser.
   */
  stamp?: Maybe<Scalars['String']['output']>;
  /** Total number of reactions on the reply. Reactions are hearts added to any reply. */
  totalReactions: Scalars['Int']['output'];
};

export type RescheduleDraftInput = {
  /** The Draft ID of the scheduled draft. */
  draftId: Scalars['ID']['input'];
  /** New scheduled date for the draft to be rescheduled. */
  publishAt: Scalars['DateTime']['input'];
};

export type RescheduleDraftPayload = {
  __typename?: 'RescheduleDraftPayload';
  /** Payload returned in response of reschedulePost mutation. */
  scheduledPost: ScheduledPost;
};

export type ResendWebhookRequestInput = {
  webhookId: Scalars['ID']['input'];
  webhookMessageId: Scalars['ID']['input'];
};

export type ResendWebhookRequestPayload = {
  __typename?: 'ResendWebhookRequestPayload';
  webhookMessage?: Maybe<WebhookMessage>;
};

/** Information to help in seo related meta tags. */
export type Seo = {
  __typename?: 'SEO';
  /** The description used in og:description tag for SEO purposes. */
  description?: Maybe<Scalars['String']['output']>;
  /** The title used in og:title tag for SEO purposes. */
  title?: Maybe<Scalars['String']['output']>;
};

export type ScheduleDraftInput = {
  /** The Author ID of the draft that should be published */
  authorId: Scalars['ID']['input'];
  /** The id of the draft that should be published */
  draftId: Scalars['ID']['input'];
  /** The date the draft should be published */
  publishAt: Scalars['DateTime']['input'];
};

export type ScheduleDraftPayload = {
  __typename?: 'ScheduleDraftPayload';
  /** Payload returned in response of reschedulePost mutation. */
  scheduledPost: ScheduledPost;
};

/**
 * Contains basic information about the scheduled post.
 * A scheduled post is a post that is scheduled to be published in the future.
 */
export type ScheduledPost = Node & {
  __typename?: 'ScheduledPost';
  /** The date the scheduled post was created. */
  author: User;
  /** Returns the draft associated with the scheduled post. */
  draft?: Maybe<Draft>;
  /** The ID of the scheduled post. */
  id: Scalars['ID']['output'];
  /** Returns the publication the post is scheduled for. */
  publication: Publication;
  /** Returns user who scheduled the post. This is usually the author of the post. */
  scheduledBy?: Maybe<User>;
  /** The scheduled date for the post to be published. This is the date the post will be published. */
  scheduledDate: Scalars['DateTime']['output'];
};

/** Enum of all the scopes that can be used with the @requireAuth directive. */
export enum Scope {
  AcknowledgeEmailImport = 'acknowledge_email_import',
  ActiveProUser = 'active_pro_user',
  AssignProPublications = 'assign_pro_publications',
  ChangeProSubscription = 'change_pro_subscription',
  CreatePro = 'create_pro',
  ImportSubscribersToPublication = 'import_subscribers_to_publication',
  PublicationAdmin = 'publication_admin',
  PublicationMember = 'publication_member',
  PublishComment = 'publish_comment',
  PublishDraft = 'publish_draft',
  PublishPost = 'publish_post',
  PublishReply = 'publish_reply',
  RecommendPublications = 'recommend_publications',
  RemoveComment = 'remove_comment',
  RemoveReply = 'remove_reply',
  Signup = 'signup',
  TeamHashnode = 'team_hashnode',
  UpdateComment = 'update_comment',
  UpdatePost = 'update_post',
  UpdateReply = 'update_reply',
  WebhookAdmin = 'webhook_admin',
  WriteDraft = 'write_draft',
  WritePost = 'write_post',
  WriteSeries = 'write_series'
}

/**
 * Connection for posts within a publication search. Contains a list of edges containing nodes.
 * Each node is a post.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type SearchPostConnection = Connection & {
  __typename?: 'SearchPostConnection';
  /** A list of edges containing Post information */
  edges: Array<PostEdge>;
  /** Information for pagination in Post connection. */
  pageInfo: PageInfo;
};

export type SearchPostsOfPublicationFilter = {
  /** The ID of publications to search from. */
  publicationId: Scalars['ObjectId']['input'];
  /** The query to be searched in post. */
  query: Scalars['String']['input'];
};

/**
 * Contains basic information about the series.
 * A series is a collection of posts that are related to each other.
 */
export type Series = Node & {
  __typename?: 'Series';
  /** Returns the user who is author of the series. */
  author: User;
  /** The cover image of the series. */
  coverImage?: Maybe<Scalars['String']['output']>;
  /** The date and time the series was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Unique identifier for the series. */
  cuid?: Maybe<Scalars['ID']['output']>;
  /** The description of the series. Contains markdown and html version of the series's description. */
  description?: Maybe<Content>;
  /** The ID of the series. */
  id: Scalars['ID']['output'];
  /** The name of the series. Shown in series page. */
  name: Scalars['String']['output'];
  /** Returns a list of posts in the series. */
  posts: SeriesPostConnection;
  /** The slug of the series. Used to access series page.  Example https://johndoe.com/series/series-slug */
  slug: Scalars['String']['output'];
  /** The sort order of the series, determines if the latest posts should appear first or last in series. */
  sortOrder: SortOrder;
};


/**
 * Contains basic information about the series.
 * A series is a collection of posts that are related to each other.
 */
export type SeriesPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
};

/**
 * Connection for Series. Contains a list of edges containing nodes.
 * Each node is a Series.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type SeriesConnection = Connection & {
  __typename?: 'SeriesConnection';
  /** A list of edges containing Series information */
  edges: Array<SeriesEdge>;
  /** Information for pagination in SeriesList connection. */
  pageInfo: PageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/** Contains a Series and a cursor for pagination. */
export type SeriesEdge = Edge & {
  __typename?: 'SeriesEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The node holding the Series information */
  node: Series;
};

/**
 * Connection for posts within a series. Contains a list of edges containing nodes.
 * Each node is a post.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type SeriesPostConnection = Connection & {
  __typename?: 'SeriesPostConnection';
  /** A list of edges containing Post information */
  edges: Array<PostEdge>;
  /** Information for pagination in Post connection. */
  pageInfo: PageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/** Available social media links. */
export type SocialMediaLinks = {
  __typename?: 'SocialMediaLinks';
  /** The user's Facebook profile. */
  facebook?: Maybe<Scalars['String']['output']>;
  /** The user's GitHub profile. */
  github?: Maybe<Scalars['String']['output']>;
  /** The user's Instagram profile. */
  instagram?: Maybe<Scalars['String']['output']>;
  /** The user's LinkedIn profile. */
  linkedin?: Maybe<Scalars['String']['output']>;
  /** The user's StackOverflow profile. */
  stackoverflow?: Maybe<Scalars['String']['output']>;
  /** The user's Twitter profile. */
  twitter?: Maybe<Scalars['String']['output']>;
  /** The user's website. */
  website?: Maybe<Scalars['String']['output']>;
  /** The user's YouTube profile. */
  youtube?: Maybe<Scalars['String']['output']>;
};

/** SortOrder is a common enum for all types that can be sorted. */
export enum SortOrder {
  Asc = 'asc',
  Dsc = 'dsc'
}

/**
 * Contains basic information about the static page.
 * Static pages are pages that are written in markdown and can be added to blog.
 */
export type StaticPage = Node & {
  __typename?: 'StaticPage';
  /** Content of the static page. Contains markdown and html version of the static page's content. */
  content: Content;
  /** A flag to determine if the static page is hidden from public or not, this is used to hide the page instead of deleting it. */
  hidden: Scalars['Boolean']['output'];
  /** The ID of the static page. */
  id: Scalars['ID']['output'];
  /** Information about the static page's Open Graph metadata i.e. image. */
  ogMetaData?: Maybe<OpenGraphMetaData>;
  /** Information about the static page's SEO metadata i.e. title and description. */
  seo?: Maybe<Seo>;
  /** The slug of the static page. Used to access static page.  Example https://johndoe.com/my-page */
  slug: Scalars['String']['output'];
  /** The title of the static page. Shown in nav bar. */
  title: Scalars['String']['output'];
};

/**
 * Connection to get list of static pages.
 * Returns a list of edges which contains the static page and cursor to the last item of the previous page.
 */
export type StaticPageConnection = Connection & {
  __typename?: 'StaticPageConnection';
  /** A list of edges containing nodes in the connection. */
  edges: Array<StaticPageEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/** An edge that contains a node of type static page and cursor to the node. */
export type StaticPageEdge = Edge & {
  __typename?: 'StaticPageEdge';
  /** A cursor to the last item of the previous page. */
  cursor: Scalars['String']['output'];
  /** The node containing a static page. */
  node: StaticPage;
};

/** Contains the publication's Stripe configuration. */
export type StripeConfiguration = {
  __typename?: 'StripeConfiguration';
  /** The Stripe account ID of the publication. */
  accountId?: Maybe<Scalars['String']['output']>;
  /** A flag indicating if the publication is connected to Stripe. */
  connected: Scalars['Boolean']['output'];
  /** The country of origin of the publication. */
  country?: Maybe<Scalars['String']['output']>;
};

export type SubscribeToNewsletterInput = {
  /** The email of the subscriber. */
  email: Scalars['String']['input'];
  /** The ID of the publication to subscribe to. */
  publicationId: Scalars['ObjectId']['input'];
};

export type SubscribeToNewsletterPayload = {
  __typename?: 'SubscribeToNewsletterPayload';
  status?: Maybe<NewsletterSubscribeStatus>;
};

export type TableOfContentsFeature = Feature & {
  __typename?: 'TableOfContentsFeature';
  /** Wether or not ser has chosen to show a table of contents on the post. */
  isEnabled: Scalars['Boolean']['output'];
  /** The content of the table of contents. */
  items: Array<TableOfContentsItem>;
};

export type TableOfContentsItem = Node & {
  __typename?: 'TableOfContentsItem';
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** The level of nesting. Refers to the heading level in the post. */
  level: Scalars['Int']['output'];
  /** ID of the `TableOfContentsItem` that is one level higher in the hierarchy. `null` if this is a top level item. */
  parentId?: Maybe<Scalars['ID']['output']>;
  /** The slug of the referenced headline. */
  slug: Scalars['String']['output'];
  /** The title of the referenced headline. */
  title: Scalars['String']['output'];
};

export type Tag = ITag & Node & {
  __typename?: 'Tag';
  /** Total number of users following this tag. */
  followersCount: Scalars['Int']['output'];
  /** The ID of the tag. */
  id: Scalars['ID']['output'];
  /** Information about the tag. Contains markdown html and text version of the tag's info. */
  info?: Maybe<Content>;
  /** The logo of the tag. Shown in tag page. */
  logo?: Maybe<Scalars['String']['output']>;
  /** The name of the tag. Shown in tag page. */
  name: Scalars['String']['output'];
  /** Paginated list of posts published under this tag */
  posts: FeedPostConnection;
  /** Alltime usage count of this tag in posts. */
  postsCount: Scalars['Int']['output'];
  /** The slug of the tag. Used to access tags feed.  Example https://hashnode.com/n/graphql */
  slug: Scalars['String']['output'];
  /** The tagline of the tag. */
  tagline?: Maybe<Scalars['String']['output']>;
};


export type TagPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter: TagPostConnectionFilter;
  first: Scalars['Int']['input'];
};

/** Contains a tag and a cursor for pagination. */
export type TagEdge = Edge & {
  __typename?: 'TagEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The node holding the Tag information */
  node: Tag;
};

export type TagPostConnectionFilter = {
  /** Sort tag feed by recents, popular, or trending. Defaults to recents. */
  sortBy?: InputMaybe<TagPostsSort>;
};

/** The field by which to sort the tag feed. */
export enum TagPostsSort {
  /** Sorts by popularity, used in Hot tag feed. */
  Popular = 'popular',
  /** Determinate how to sort the results. Defaults to recents, used in New tag feed. */
  Recent = 'recent',
  /** Trending is particular used to fetch top posts trending within a week time under a tag */
  Trending = 'trending'
}

/**
 * Contains the flag indicating if the text selection sharer feature is enabled or not.
 * User can enable or disable the text selection sharer feature from the publication settings.
 * Shows a widget if a text on a blog post is selected. Allows for easy sharing or copying of the selected text.
 */
export type TextSelectionSharerFeature = Feature & {
  __typename?: 'TextSelectionSharerFeature';
  /** A flag indicating if the text selection sharer feature is enabled or not. */
  isEnabled: Scalars['Boolean']['output'];
};

/** Payload for the toggleFollowingUser mutation. */
export type ToggleFollowUserPayload = {
  __typename?: 'ToggleFollowUserPayload';
  /** The user that was followed/unfollowed. */
  user?: Maybe<User>;
};

export type TriggerWebhookTestInput = {
  webhookId: Scalars['ID']['input'];
};

export type TriggerWebhookTestPayload = {
  __typename?: 'TriggerWebhookTestPayload';
  webhook?: Maybe<Webhook>;
};

export type UnsubscribeFromNewsletterInput = {
  /** The email that is currently subscribed. */
  email: Scalars['String']['input'];
  /** The ID of the publication to unsubscribe from. */
  publicationId: Scalars['ObjectId']['input'];
};

export type UnsubscribeFromNewsletterPayload = {
  __typename?: 'UnsubscribeFromNewsletterPayload';
  status?: Maybe<NewsletterUnsubscribeStatus>;
};

export type UpdateCommentInput = {
  contentMarkdown: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};

export type UpdateCommentPayload = {
  __typename?: 'UpdateCommentPayload';
  comment?: Maybe<Comment>;
};

export type UpdatePostInput = {
  /**
   * Update co-authors of the post.
   * Must be a member of the publication.
   */
  coAuthors?: InputMaybe<Array<Scalars['ObjectId']['input']>>;
  /** The publication the post is published to. */
  contentMarkdown?: InputMaybe<Scalars['String']['input']>;
  /** Options for the cover image of the post. */
  coverImageOptions?: InputMaybe<CoverImageOptionsInput>;
  /** The id of the post to update. */
  id: Scalars['ID']['input'];
  /** Information about the meta tags added to the post, used for SEO purpose. */
  metaTags?: InputMaybe<MetaTagsInput>;
  /** Canonical URL of the original article. */
  originalArticleURL?: InputMaybe<Scalars['String']['input']>;
  /** If the publication should be changed this is the new Publication ID */
  publicationId?: InputMaybe<Scalars['ObjectId']['input']>;
  /**
   * Set a different author for the post than the requesting user.
   * Must be a member of the publication.
   */
  publishAs?: InputMaybe<Scalars['ObjectId']['input']>;
  /** Backdated publish date. */
  publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
  /**
   * Providing a seriesId will add the post to that series.
   * Must be a series of the publication.
   */
  seriesId?: InputMaybe<Scalars['ObjectId']['input']>;
  /** Whether or not to enable the table of content. */
  settings?: InputMaybe<UpdatePostSettingsInput>;
  /** Slug of the post. Only if you want to override the slug that will be generated based on the title. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** The subtitle of the post */
  subtitle?: InputMaybe<Scalars['String']['input']>;
  /** Tags to add to the post. New tags will be created if they don't exist. It overrides the existing tags. */
  tags?: InputMaybe<Array<PublishPostTagInput>>;
  /** The new title of the post */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePostPayload = {
  __typename?: 'UpdatePostPayload';
  post?: Maybe<Post>;
};

export type UpdatePostSettingsInput = {
  /** A flag to indicate if the post is delisted, used to hide the post from public feed. */
  delisted?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether or not comments should be disabled. */
  disableComments?: InputMaybe<Scalars['Boolean']['input']>;
  /** A flag to indicate if the post contains table of content */
  isTableOfContentEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Pin the post to the blog homepage. */
  pinToBlog?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateReplyInput = {
  commentId: Scalars['ID']['input'];
  contentMarkdown: Scalars['String']['input'];
  replyId: Scalars['ID']['input'];
};

export type UpdateReplyPayload = {
  __typename?: 'UpdateReplyPayload';
  reply?: Maybe<Reply>;
};

export type UpdateWebhookInput = {
  events?: InputMaybe<Array<WebhookEvent>>;
  id: Scalars['ID']['input'];
  secret?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWebhookPayload = {
  __typename?: 'UpdateWebhookPayload';
  webhook?: Maybe<Webhook>;
};

export enum UrlPattern {
  /** Post URLs contain the slug (for example `my slug`) and a random id (like `1234`) , e.g. "/my-slug-1234". */
  Default = 'DEFAULT',
  /** Post URLs only contain the slug, e.g. "/my-slug". */
  Simple = 'SIMPLE'
}

/** Basic information about a user on Hashnode. */
export type User = IUser & Node & {
  __typename?: 'User';
  /**
   * Whether or not the user is an ambassador.
   * @deprecated Ambassadors program no longer active. Will be removed after 02/01/2024
   */
  ambassador: Scalars['Boolean']['output'];
  /** The availability of the user based on tech stack and interests. Shown on the "I am available for" section in user's profile. */
  availableFor?: Maybe<Scalars['String']['output']>;
  /** Returns a list of badges that the user has earned. Shown on blogs /badges page. Example - https://iamshadmirza.com/badges */
  badges: Array<Badge>;
  /** The bio of the user. Visible in about me section of the user's profile. */
  bio?: Maybe<Content>;
  /**
   * The bio of the user. Visible in about me section of the user's profile.
   * @deprecated Will be removed on 26/10/2023. Use bio instead of bioV2
   */
  bioV2?: Maybe<Content>;
  /** The date the user joined Hashnode. */
  dateJoined?: Maybe<Scalars['DateTime']['output']>;
  /** Whether or not the user is deactivated. */
  deactivated: Scalars['Boolean']['output'];
  /** The users who are following this user */
  followers: UserConnection;
  /** The number of users that follow the requested user. Visible in the user's profile. */
  followersCount: Scalars['Int']['output'];
  /**
   * Wether or not the authenticated user follows this user.
   * Returns false if the authenticated user this user.
   */
  following: Scalars['Boolean']['output'];
  /** The number of users that this user is following. Visible in the user's profile. */
  followingsCount: Scalars['Int']['output'];
  /** The users which this user is following */
  follows: UserConnection;
  /**
   * Wether or not this user follows the authenticated user.
   * Returns false if the authenticated user this user.
   */
  followsBack: Scalars['Boolean']['output'];
  /** The ID of the user. It can be used to identify the user. */
  id: Scalars['ID']['output'];
  /** Wether or not this is a pro user. */
  isPro: Scalars['Boolean']['output'];
  /** The location of the user. */
  location?: Maybe<Scalars['String']['output']>;
  /** The name of the user. */
  name: Scalars['String']['output'];
  /** Returns the list of posts the user has published. */
  posts: UserPostConnection;
  /** The URL to the profile picture of the user. */
  profilePicture?: Maybe<Scalars['String']['output']>;
  /** Publications associated with the user. Includes personal and team publications. */
  publications: UserPublicationsConnection;
  /** The social media links of the user. Shown on the user's profile. */
  socialMediaLinks?: Maybe<SocialMediaLinks>;
  /** The tagline of the user. Shown on the user's profile below the name. */
  tagline?: Maybe<Scalars['String']['output']>;
  /** Returns a list of tags that the user follows. */
  tagsFollowing: Array<Tag>;
  /** The username of the user. It is unique and tied with user's profile URL. Example - https://hashnode.com/@username */
  username: Scalars['String']['output'];
};


/** Basic information about a user on Hashnode. */
export type UserFollowersArgs = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};


/** Basic information about a user on Hashnode. */
export type UserFollowsArgs = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
};


/** Basic information about a user on Hashnode. */
export type UserPostsArgs = {
  filter?: InputMaybe<UserPostConnectionFilter>;
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  sortBy?: InputMaybe<UserPostsSort>;
};


/** Basic information about a user on Hashnode. */
export type UserPublicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<UserPublicationsConnectionFilter>;
  first: Scalars['Int']['input'];
};

/**
 * Connection for users to another user. Contains a list of nodes.
 * Each node is a user.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type UserConnection = PageConnection & {
  __typename?: 'UserConnection';
  /** A list of users */
  nodes: Array<User>;
  /** Information for page based pagination in users connection. */
  pageInfo: OffsetPageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/** Contains a node of type user and cursor for pagination. */
export type UserEdge = Edge & {
  __typename?: 'UserEdge';
  /** The cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The node containing User information */
  node: User;
};

/**
 * Connection for posts written by a single user. Contains a list of edges containing nodes.
 * Each node is a post.
 * Page info contains information about pagination like hasNextPage and endCursor.
 */
export type UserPostConnection = PageConnection & {
  __typename?: 'UserPostConnection';
  /** A list of edges containing Post information */
  edges: Array<UserPostEdge>;
  /** A list of posts */
  nodes: Array<Post>;
  /** Information for page based pagination in Post connection. */
  pageInfo: OffsetPageInfo;
  /** The total number of documents in the connection. */
  totalDocuments: Scalars['Int']['output'];
};

/** Filter for the posts of a user. */
export type UserPostConnectionFilter = {
  /** Filtering by author status. Either all posts the user has authored or co-authored are returned or the authored posts only. */
  authorType?: InputMaybe<UserPostsAuthorTypeFilter>;
  /** Filtering by publication IDs will return posts from the author within the publication. */
  publications?: InputMaybe<Array<Scalars['ID']['input']>>;
  /**
   * Only include posts that reference the provided tag slugs.
   *
   * Filtering by `tags` and `tagSlugs` will filter posts that match either of those two filters.
   */
  tagSlugs?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * Only include posts that reference the provided tag IDs.
   *
   *
   * Filtering by `tags` and `tagSlugs` will filter posts that match either of those two filters.
   */
  tags?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Contains a post and the author status. */
export type UserPostEdge = {
  __typename?: 'UserPostEdge';
  /** Indicates weather the user is the author or co-author of the post. */
  authorType: PostAuthorType;
  /** The node holding the Post information. */
  node: Post;
};

/** Filter for the posts of a user. */
export enum UserPostsAuthorTypeFilter {
  /** Only posts that are authored by the user. */
  AuthorOnly = 'AUTHOR_ONLY',
  /** Only posts that are co-authored by the user. */
  CoAuthorOnly = 'CO_AUTHOR_ONLY'
}

/** Sorting for the posts of a user. */
export enum UserPostsSort {
  /** Oldest posts first. */
  DatePublishedAsc = 'DATE_PUBLISHED_ASC',
  /** Newest posts first. */
  DatePublishedDesc = 'DATE_PUBLISHED_DESC'
}

/** The role of the user in the publication. */
export enum UserPublicationRole {
  /** Contributors can join the publication and contribute an article. They cannot directly publish a new article. */
  Contributor = 'CONTRIBUTOR',
  /**
   * The editor has access to the publication dashboard to customize the blog and approve/reject posts.
   * They also have access to the member panel to add/modify/remove members. Editors cannot remove other editors or update their roles.
   */
  Editor = 'EDITOR',
  /** The owner is the creator of the publication and can do all things, including delete publication. */
  Owner = 'OWNER'
}

/**
 * Connection to get list of publications.
 * Returns a list of edges which contains the publications and cursor to the last item of the previous page.
 */
export type UserPublicationsConnection = Connection & {
  __typename?: 'UserPublicationsConnection';
  /** A list of edges of publications connection. */
  edges: Array<UserPublicationsEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total amount of publications taking into account the filter. */
  totalDocuments: Scalars['Int']['output'];
};

/** Filter to apply to the publications. */
export type UserPublicationsConnectionFilter = {
  /** Only return pro publications. */
  isPro?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only include publication in which the user has one of the provided roles. */
  roles?: InputMaybe<Array<UserPublicationRole>>;
};

/** An edge that contains a node of type publication and cursor to the node. */
export type UserPublicationsEdge = Edge & {
  __typename?: 'UserPublicationsEdge';
  /** The cursor to the node. */
  cursor: Scalars['String']['output'];
  /** Node containing the publication. */
  node: Publication;
  /** The role of the user in the publication. */
  role: UserPublicationRole;
};

export type UserRecommendedPublicationEdge = {
  __typename?: 'UserRecommendedPublicationEdge';
  /** The publication that is recommended by the publication this connection originates from. */
  node: Publication;
  /** The amount of followers the publication referenced in `node` has gained by recommendations from the publication. */
  totalFollowersGained: Scalars['Int']['output'];
};

export type UserRecommendingPublicationEdge = {
  __typename?: 'UserRecommendingPublicationEdge';
  /** The publication that is recommending the publication this connection originates from. */
  node: Publication;
  /** The amount of followers the publication has gained by recommendations from the publication referenced in `node`. */
  totalFollowersGained: Scalars['Int']['output'];
};

/**
 * Contains the flag indicating if the view count feature is enabled or not.
 * User can enable or disable the view count feature from the publication settings.
 * Shows total views on blogs if enabled.
 */
export type ViewCountFeature = Feature & {
  __typename?: 'ViewCountFeature';
  /** A flag indicating if the view count feature is enabled or not. */
  isEnabled: Scalars['Boolean']['output'];
};

export type Webhook = Node & {
  __typename?: 'Webhook';
  createdAt: Scalars['DateTime']['output'];
  events: Array<WebhookEvent>;
  /** The ID of the post. Used to uniquely identify the post. */
  id: Scalars['ID']['output'];
  /**
   * Messages that has been sent via this webhook.
   * Messages include the request and eventual response.
   */
  messages: WebhookMessageConnection;
  publication: Publication;
  secret: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  url: Scalars['String']['output'];
};


export type WebhookMessagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
};

export enum WebhookEvent {
  PostDeleted = 'POST_DELETED',
  PostPublished = 'POST_PUBLISHED',
  PostUpdated = 'POST_UPDATED',
  StaticPageDeleted = 'STATIC_PAGE_DELETED',
  StaticPageEdited = 'STATIC_PAGE_EDITED',
  StaticPagePublished = 'STATIC_PAGE_PUBLISHED'
}

export type WebhookMessage = Node & {
  __typename?: 'WebhookMessage';
  createdAt: Scalars['DateTime']['output'];
  event: WebhookEvent;
  id: Scalars['ID']['output'];
  /** True if either the request failed or the response status code was not 2xx. */
  isError: Scalars['Boolean']['output'];
  /** True if the message was resent. */
  isResent: Scalars['Boolean']['output'];
  /** True if the message was sent as a test. */
  isTest: Scalars['Boolean']['output'];
  request: WebhookMessageRequest;
  response?: Maybe<WebhookMessageResponse>;
  url: Scalars['String']['output'];
};

export type WebhookMessageConnection = Connection & {
  __typename?: 'WebhookMessageConnection';
  edges: Array<WebhookMessageEdge>;
  pageInfo: PageInfo;
};

export type WebhookMessageEdge = Edge & {
  __typename?: 'WebhookMessageEdge';
  cursor: Scalars['String']['output'];
  node: WebhookMessage;
};

export type WebhookMessageRequest = {
  __typename?: 'WebhookMessageRequest';
  body: Scalars['String']['output'];
  error?: Maybe<WebhookMessageRequestError>;
  headers: Scalars['String']['output'];
  /** Unique identifier of the request. Can be used to deduplicate requests. */
  uuid: Scalars['String']['output'];
};

export type WebhookMessageRequestError = {
  __typename?: 'WebhookMessageRequestError';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type WebhookMessageResponse = {
  __typename?: 'WebhookMessageResponse';
  body?: Maybe<Scalars['String']['output']>;
  headers?: Maybe<Scalars['String']['output']>;
  httpStatus: Scalars['Int']['output'];
  /** The time it took from the moment the request has been send until the first byte of the response has been received. */
  timeToFirstByteMilliseconds?: Maybe<Scalars['Int']['output']>;
};

export type Widget = Node & {
  __typename?: 'Widget';
  /** Content of the widget, can be a simple string or HTML */
  content: Scalars['String']['output'];
  /** The date and time the widget was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The unique identifier of the widget */
  id: Scalars['ID']['output'];
  pinSettings?: Maybe<WidgetPinSettings>;
  /** WidgetId, can be embedded as %%[widgetId] in the article */
  widgetId: Scalars['String']['output'];
};

export enum WidgetPinLocation {
  Bottom = 'BOTTOM',
  Top = 'TOP'
}

export type WidgetPinSettings = {
  __typename?: 'WidgetPinSettings';
  /** Signifies if pinning of widget on all the articles of publication is enabled or not */
  isPinned: Scalars['Boolean']['output'];
  /** Describes the location of the widget on the article, can be TOP or BOTTOM */
  location: WidgetPinLocation;
};

export type AddCommentPayloadKeySpecifier = ('comment' | AddCommentPayloadKeySpecifier)[];
export type AddCommentPayloadFieldPolicy = {
	comment?: FieldPolicy<any> | FieldReadFunction<any>
};
export type AddPostToSeriesPayloadKeySpecifier = ('series' | AddPostToSeriesPayloadKeySpecifier)[];
export type AddPostToSeriesPayloadFieldPolicy = {
	series?: FieldPolicy<any> | FieldReadFunction<any>
};
export type AddReplyPayloadKeySpecifier = ('reply' | AddReplyPayloadKeySpecifier)[];
export type AddReplyPayloadFieldPolicy = {
	reply?: FieldPolicy<any> | FieldReadFunction<any>
};
export type AudioBlogFeatureKeySpecifier = ('isEnabled' | 'voiceType' | AudioBlogFeatureKeySpecifier)[];
export type AudioBlogFeatureFieldPolicy = {
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	voiceType?: FieldPolicy<any> | FieldReadFunction<any>
};
export type AudioUrlsKeySpecifier = ('female' | 'male' | AudioUrlsKeySpecifier)[];
export type AudioUrlsFieldPolicy = {
	female?: FieldPolicy<any> | FieldReadFunction<any>,
	male?: FieldPolicy<any> | FieldReadFunction<any>
};
export type BadgeKeySpecifier = ('dateAssigned' | 'description' | 'id' | 'image' | 'infoURL' | 'name' | 'suppressed' | BadgeKeySpecifier)[];
export type BadgeFieldPolicy = {
	dateAssigned?: FieldPolicy<any> | FieldReadFunction<any>,
	description?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	image?: FieldPolicy<any> | FieldReadFunction<any>,
	infoURL?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	suppressed?: FieldPolicy<any> | FieldReadFunction<any>
};
export type BetaFeatureKeySpecifier = ('description' | 'enabled' | 'id' | 'key' | 'title' | 'url' | BetaFeatureKeySpecifier)[];
export type BetaFeatureFieldPolicy = {
	description?: FieldPolicy<any> | FieldReadFunction<any>,
	enabled?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	key?: FieldPolicy<any> | FieldReadFunction<any>,
	title?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CancelScheduledDraftPayloadKeySpecifier = ('scheduledPost' | CancelScheduledDraftPayloadKeySpecifier)[];
export type CancelScheduledDraftPayloadFieldPolicy = {
	scheduledPost?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CommentKeySpecifier = ('author' | 'content' | 'dateAdded' | 'id' | 'myTotalReactions' | 'replies' | 'stamp' | 'totalReactions' | CommentKeySpecifier)[];
export type CommentFieldPolicy = {
	author?: FieldPolicy<any> | FieldReadFunction<any>,
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	dateAdded?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	myTotalReactions?: FieldPolicy<any> | FieldReadFunction<any>,
	replies?: FieldPolicy<any> | FieldReadFunction<any>,
	stamp?: FieldPolicy<any> | FieldReadFunction<any>,
	totalReactions?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CommentReplyConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | CommentReplyConnectionKeySpecifier)[];
export type CommentReplyConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CommentReplyEdgeKeySpecifier = ('cursor' | 'node' | CommentReplyEdgeKeySpecifier)[];
export type CommentReplyEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CommenterUserConnectionKeySpecifier = ('edges' | 'pageInfo' | CommenterUserConnectionKeySpecifier)[];
export type CommenterUserConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ConnectionKeySpecifier = ('edges' | 'pageInfo' | ConnectionKeySpecifier)[];
export type ConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ContentKeySpecifier = ('html' | 'markdown' | 'text' | ContentKeySpecifier)[];
export type ContentFieldPolicy = {
	html?: FieldPolicy<any> | FieldReadFunction<any>,
	markdown?: FieldPolicy<any> | FieldReadFunction<any>,
	text?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CreateWebhookPayloadKeySpecifier = ('webhook' | CreateWebhookPayloadKeySpecifier)[];
export type CreateWebhookPayloadFieldPolicy = {
	webhook?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CustomCSSKeySpecifier = ('home' | 'homeMinified' | 'post' | 'postMinified' | 'static' | 'staticMinified' | CustomCSSKeySpecifier)[];
export type CustomCSSFieldPolicy = {
	home?: FieldPolicy<any> | FieldReadFunction<any>,
	homeMinified?: FieldPolicy<any> | FieldReadFunction<any>,
	post?: FieldPolicy<any> | FieldReadFunction<any>,
	postMinified?: FieldPolicy<any> | FieldReadFunction<any>,
	static?: FieldPolicy<any> | FieldReadFunction<any>,
	staticMinified?: FieldPolicy<any> | FieldReadFunction<any>
};
export type CustomCSSFeatureKeySpecifier = ('draft' | 'isEnabled' | 'published' | CustomCSSFeatureKeySpecifier)[];
export type CustomCSSFeatureFieldPolicy = {
	draft?: FieldPolicy<any> | FieldReadFunction<any>,
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	published?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DarkModePreferencesKeySpecifier = ('enabled' | 'logo' | DarkModePreferencesKeySpecifier)[];
export type DarkModePreferencesFieldPolicy = {
	enabled?: FieldPolicy<any> | FieldReadFunction<any>,
	logo?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DeleteWebhookPayloadKeySpecifier = ('webhook' | DeleteWebhookPayloadKeySpecifier)[];
export type DeleteWebhookPayloadFieldPolicy = {
	webhook?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DomainInfoKeySpecifier = ('domain' | 'hashnodeSubdomain' | 'wwwPrefixedDomain' | DomainInfoKeySpecifier)[];
export type DomainInfoFieldPolicy = {
	domain?: FieldPolicy<any> | FieldReadFunction<any>,
	hashnodeSubdomain?: FieldPolicy<any> | FieldReadFunction<any>,
	wwwPrefixedDomain?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DomainStatusKeySpecifier = ('host' | 'ready' | DomainStatusKeySpecifier)[];
export type DomainStatusFieldPolicy = {
	host?: FieldPolicy<any> | FieldReadFunction<any>,
	ready?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftKeySpecifier = ('author' | 'canonicalUrl' | 'coAuthors' | 'content' | 'coverImage' | 'dateUpdated' | 'features' | 'id' | 'lastBackup' | 'lastFailedBackupAt' | 'lastSuccessfulBackupAt' | 'ogMetaData' | 'readTimeInMinutes' | 'seo' | 'series' | 'settings' | 'slug' | 'subtitle' | 'tags' | 'tagsV2' | 'title' | 'updatedAt' | DraftKeySpecifier)[];
export type DraftFieldPolicy = {
	author?: FieldPolicy<any> | FieldReadFunction<any>,
	canonicalUrl?: FieldPolicy<any> | FieldReadFunction<any>,
	coAuthors?: FieldPolicy<any> | FieldReadFunction<any>,
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	coverImage?: FieldPolicy<any> | FieldReadFunction<any>,
	dateUpdated?: FieldPolicy<any> | FieldReadFunction<any>,
	features?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	lastBackup?: FieldPolicy<any> | FieldReadFunction<any>,
	lastFailedBackupAt?: FieldPolicy<any> | FieldReadFunction<any>,
	lastSuccessfulBackupAt?: FieldPolicy<any> | FieldReadFunction<any>,
	ogMetaData?: FieldPolicy<any> | FieldReadFunction<any>,
	readTimeInMinutes?: FieldPolicy<any> | FieldReadFunction<any>,
	seo?: FieldPolicy<any> | FieldReadFunction<any>,
	series?: FieldPolicy<any> | FieldReadFunction<any>,
	settings?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	subtitle?: FieldPolicy<any> | FieldReadFunction<any>,
	tags?: FieldPolicy<any> | FieldReadFunction<any>,
	tagsV2?: FieldPolicy<any> | FieldReadFunction<any>,
	title?: FieldPolicy<any> | FieldReadFunction<any>,
	updatedAt?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftBackupKeySpecifier = ('at' | 'status' | DraftBackupKeySpecifier)[];
export type DraftBackupFieldPolicy = {
	at?: FieldPolicy<any> | FieldReadFunction<any>,
	status?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftBaseTagKeySpecifier = ('name' | 'slug' | DraftBaseTagKeySpecifier)[];
export type DraftBaseTagFieldPolicy = {
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | DraftConnectionKeySpecifier)[];
export type DraftConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftCoverImageKeySpecifier = ('attribution' | 'isAttributionHidden' | 'photographer' | 'url' | DraftCoverImageKeySpecifier)[];
export type DraftCoverImageFieldPolicy = {
	attribution?: FieldPolicy<any> | FieldReadFunction<any>,
	isAttributionHidden?: FieldPolicy<any> | FieldReadFunction<any>,
	photographer?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftEdgeKeySpecifier = ('cursor' | 'node' | DraftEdgeKeySpecifier)[];
export type DraftEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftFeaturesKeySpecifier = ('tableOfContents' | DraftFeaturesKeySpecifier)[];
export type DraftFeaturesFieldPolicy = {
	tableOfContents?: FieldPolicy<any> | FieldReadFunction<any>
};
export type DraftSettingsKeySpecifier = ('disableComments' | 'isDelisted' | 'stickCoverToBottom' | DraftSettingsKeySpecifier)[];
export type DraftSettingsFieldPolicy = {
	disableComments?: FieldPolicy<any> | FieldReadFunction<any>,
	isDelisted?: FieldPolicy<any> | FieldReadFunction<any>,
	stickCoverToBottom?: FieldPolicy<any> | FieldReadFunction<any>
};
export type EdgeKeySpecifier = ('cursor' | 'node' | EdgeKeySpecifier)[];
export type EdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type EmailCurrentImportKeySpecifier = ('attemptedToImport' | 'filename' | 'importStartedAt' | 'status' | 'successfullyImported' | EmailCurrentImportKeySpecifier)[];
export type EmailCurrentImportFieldPolicy = {
	attemptedToImport?: FieldPolicy<any> | FieldReadFunction<any>,
	filename?: FieldPolicy<any> | FieldReadFunction<any>,
	importStartedAt?: FieldPolicy<any> | FieldReadFunction<any>,
	status?: FieldPolicy<any> | FieldReadFunction<any>,
	successfullyImported?: FieldPolicy<any> | FieldReadFunction<any>
};
export type EmailImportKeySpecifier = ('currentImport' | EmailImportKeySpecifier)[];
export type EmailImportFieldPolicy = {
	currentImport?: FieldPolicy<any> | FieldReadFunction<any>
};
export type FeatureKeySpecifier = ('isEnabled' | FeatureKeySpecifier)[];
export type FeatureFieldPolicy = {
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>
};
export type FeedPostConnectionKeySpecifier = ('edges' | 'pageInfo' | FeedPostConnectionKeySpecifier)[];
export type FeedPostConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ITagKeySpecifier = ('followersCount' | 'id' | 'info' | 'logo' | 'name' | 'postsCount' | 'slug' | 'tagline' | ITagKeySpecifier)[];
export type ITagFieldPolicy = {
	followersCount?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	info?: FieldPolicy<any> | FieldReadFunction<any>,
	logo?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	postsCount?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	tagline?: FieldPolicy<any> | FieldReadFunction<any>
};
export type IUserKeySpecifier = ('ambassador' | 'availableFor' | 'badges' | 'bio' | 'dateJoined' | 'deactivated' | 'followers' | 'followersCount' | 'followingsCount' | 'follows' | 'id' | 'location' | 'name' | 'posts' | 'profilePicture' | 'publications' | 'socialMediaLinks' | 'tagline' | 'tagsFollowing' | 'username' | IUserKeySpecifier)[];
export type IUserFieldPolicy = {
	ambassador?: FieldPolicy<any> | FieldReadFunction<any>,
	availableFor?: FieldPolicy<any> | FieldReadFunction<any>,
	badges?: FieldPolicy<any> | FieldReadFunction<any>,
	bio?: FieldPolicy<any> | FieldReadFunction<any>,
	dateJoined?: FieldPolicy<any> | FieldReadFunction<any>,
	deactivated?: FieldPolicy<any> | FieldReadFunction<any>,
	followers?: FieldPolicy<any> | FieldReadFunction<any>,
	followersCount?: FieldPolicy<any> | FieldReadFunction<any>,
	followingsCount?: FieldPolicy<any> | FieldReadFunction<any>,
	follows?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	location?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	posts?: FieldPolicy<any> | FieldReadFunction<any>,
	profilePicture?: FieldPolicy<any> | FieldReadFunction<any>,
	publications?: FieldPolicy<any> | FieldReadFunction<any>,
	socialMediaLinks?: FieldPolicy<any> | FieldReadFunction<any>,
	tagline?: FieldPolicy<any> | FieldReadFunction<any>,
	tagsFollowing?: FieldPolicy<any> | FieldReadFunction<any>,
	username?: FieldPolicy<any> | FieldReadFunction<any>
};
export type LikeCommentPayloadKeySpecifier = ('comment' | LikeCommentPayloadKeySpecifier)[];
export type LikeCommentPayloadFieldPolicy = {
	comment?: FieldPolicy<any> | FieldReadFunction<any>
};
export type LikePostPayloadKeySpecifier = ('post' | LikePostPayloadKeySpecifier)[];
export type LikePostPayloadFieldPolicy = {
	post?: FieldPolicy<any> | FieldReadFunction<any>
};
export type MutationKeySpecifier = ('addComment' | 'addPostToSeries' | 'addReply' | 'cancelScheduledDraft' | 'createWebhook' | 'deleteWebhook' | 'likeComment' | 'likePost' | 'publishDraft' | 'publishPost' | 'recommendPublications' | 'removeComment' | 'removePost' | 'removeRecommendation' | 'removeReply' | 'rescheduleDraft' | 'resendWebhookRequest' | 'scheduleDraft' | 'subscribeToNewsletter' | 'toggleFollowUser' | 'triggerWebhookTest' | 'unsubscribeFromNewsletter' | 'updateComment' | 'updatePost' | 'updateReply' | 'updateWebhook' | MutationKeySpecifier)[];
export type MutationFieldPolicy = {
	addComment?: FieldPolicy<any> | FieldReadFunction<any>,
	addPostToSeries?: FieldPolicy<any> | FieldReadFunction<any>,
	addReply?: FieldPolicy<any> | FieldReadFunction<any>,
	cancelScheduledDraft?: FieldPolicy<any> | FieldReadFunction<any>,
	createWebhook?: FieldPolicy<any> | FieldReadFunction<any>,
	deleteWebhook?: FieldPolicy<any> | FieldReadFunction<any>,
	likeComment?: FieldPolicy<any> | FieldReadFunction<any>,
	likePost?: FieldPolicy<any> | FieldReadFunction<any>,
	publishDraft?: FieldPolicy<any> | FieldReadFunction<any>,
	publishPost?: FieldPolicy<any> | FieldReadFunction<any>,
	recommendPublications?: FieldPolicy<any> | FieldReadFunction<any>,
	removeComment?: FieldPolicy<any> | FieldReadFunction<any>,
	removePost?: FieldPolicy<any> | FieldReadFunction<any>,
	removeRecommendation?: FieldPolicy<any> | FieldReadFunction<any>,
	removeReply?: FieldPolicy<any> | FieldReadFunction<any>,
	rescheduleDraft?: FieldPolicy<any> | FieldReadFunction<any>,
	resendWebhookRequest?: FieldPolicy<any> | FieldReadFunction<any>,
	scheduleDraft?: FieldPolicy<any> | FieldReadFunction<any>,
	subscribeToNewsletter?: FieldPolicy<any> | FieldReadFunction<any>,
	toggleFollowUser?: FieldPolicy<any> | FieldReadFunction<any>,
	triggerWebhookTest?: FieldPolicy<any> | FieldReadFunction<any>,
	unsubscribeFromNewsletter?: FieldPolicy<any> | FieldReadFunction<any>,
	updateComment?: FieldPolicy<any> | FieldReadFunction<any>,
	updatePost?: FieldPolicy<any> | FieldReadFunction<any>,
	updateReply?: FieldPolicy<any> | FieldReadFunction<any>,
	updateWebhook?: FieldPolicy<any> | FieldReadFunction<any>
};
export type MyUserKeySpecifier = ('ambassador' | 'availableFor' | 'badges' | 'betaFeatures' | 'bio' | 'dateJoined' | 'deactivated' | 'email' | 'followers' | 'followersCount' | 'followingsCount' | 'follows' | 'id' | 'location' | 'name' | 'posts' | 'profilePicture' | 'provider' | 'publications' | 'socialMediaLinks' | 'tagline' | 'tagsFollowing' | 'unsubscribeCode' | 'username' | MyUserKeySpecifier)[];
export type MyUserFieldPolicy = {
	ambassador?: FieldPolicy<any> | FieldReadFunction<any>,
	availableFor?: FieldPolicy<any> | FieldReadFunction<any>,
	badges?: FieldPolicy<any> | FieldReadFunction<any>,
	betaFeatures?: FieldPolicy<any> | FieldReadFunction<any>,
	bio?: FieldPolicy<any> | FieldReadFunction<any>,
	dateJoined?: FieldPolicy<any> | FieldReadFunction<any>,
	deactivated?: FieldPolicy<any> | FieldReadFunction<any>,
	email?: FieldPolicy<any> | FieldReadFunction<any>,
	followers?: FieldPolicy<any> | FieldReadFunction<any>,
	followersCount?: FieldPolicy<any> | FieldReadFunction<any>,
	followingsCount?: FieldPolicy<any> | FieldReadFunction<any>,
	follows?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	location?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	posts?: FieldPolicy<any> | FieldReadFunction<any>,
	profilePicture?: FieldPolicy<any> | FieldReadFunction<any>,
	provider?: FieldPolicy<any> | FieldReadFunction<any>,
	publications?: FieldPolicy<any> | FieldReadFunction<any>,
	socialMediaLinks?: FieldPolicy<any> | FieldReadFunction<any>,
	tagline?: FieldPolicy<any> | FieldReadFunction<any>,
	tagsFollowing?: FieldPolicy<any> | FieldReadFunction<any>,
	unsubscribeCode?: FieldPolicy<any> | FieldReadFunction<any>,
	username?: FieldPolicy<any> | FieldReadFunction<any>
};
export type NewsletterFeatureKeySpecifier = ('frequency' | 'isEnabled' | NewsletterFeatureKeySpecifier)[];
export type NewsletterFeatureFieldPolicy = {
	frequency?: FieldPolicy<any> | FieldReadFunction<any>,
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>
};
export type NodeKeySpecifier = ('id' | NodeKeySpecifier)[];
export type NodeFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>
};
export type OffsetPageInfoKeySpecifier = ('hasNextPage' | 'hasPreviousPage' | 'nextPage' | 'previousPage' | OffsetPageInfoKeySpecifier)[];
export type OffsetPageInfoFieldPolicy = {
	hasNextPage?: FieldPolicy<any> | FieldReadFunction<any>,
	hasPreviousPage?: FieldPolicy<any> | FieldReadFunction<any>,
	nextPage?: FieldPolicy<any> | FieldReadFunction<any>,
	previousPage?: FieldPolicy<any> | FieldReadFunction<any>
};
export type OpenGraphMetaDataKeySpecifier = ('image' | OpenGraphMetaDataKeySpecifier)[];
export type OpenGraphMetaDataFieldPolicy = {
	image?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PageConnectionKeySpecifier = ('nodes' | 'pageInfo' | PageConnectionKeySpecifier)[];
export type PageConnectionFieldPolicy = {
	nodes?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PageInfoKeySpecifier = ('endCursor' | 'hasNextPage' | PageInfoKeySpecifier)[];
export type PageInfoFieldPolicy = {
	endCursor?: FieldPolicy<any> | FieldReadFunction<any>,
	hasNextPage?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PagesPreferencesKeySpecifier = ('badges' | 'members' | 'newsletter' | PagesPreferencesKeySpecifier)[];
export type PagesPreferencesFieldPolicy = {
	badges?: FieldPolicy<any> | FieldReadFunction<any>,
	members?: FieldPolicy<any> | FieldReadFunction<any>,
	newsletter?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PopularTagKeySpecifier = ('followersCount' | 'id' | 'info' | 'logo' | 'name' | 'postsCount' | 'postsCountInPeriod' | 'slug' | 'tagline' | PopularTagKeySpecifier)[];
export type PopularTagFieldPolicy = {
	followersCount?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	info?: FieldPolicy<any> | FieldReadFunction<any>,
	logo?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	postsCount?: FieldPolicy<any> | FieldReadFunction<any>,
	postsCountInPeriod?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	tagline?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PopularTagEdgeKeySpecifier = ('cursor' | 'node' | PopularTagEdgeKeySpecifier)[];
export type PopularTagEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostKeySpecifier = ('audioUrls' | 'author' | 'bookmarked' | 'brief' | 'canonicalUrl' | 'coAuthors' | 'commenters' | 'comments' | 'content' | 'contributors' | 'coverImage' | 'cuid' | 'featured' | 'featuredAt' | 'features' | 'hasLatexInPost' | 'id' | 'isAutoPublishedFromRSS' | 'isFollowed' | 'likedBy' | 'ogMetaData' | 'preferences' | 'publication' | 'publishedAt' | 'reactionCount' | 'readTimeInMinutes' | 'replyCount' | 'responseCount' | 'seo' | 'series' | 'slug' | 'subtitle' | 'tags' | 'title' | 'updatedAt' | 'url' | 'views' | PostKeySpecifier)[];
export type PostFieldPolicy = {
	audioUrls?: FieldPolicy<any> | FieldReadFunction<any>,
	author?: FieldPolicy<any> | FieldReadFunction<any>,
	bookmarked?: FieldPolicy<any> | FieldReadFunction<any>,
	brief?: FieldPolicy<any> | FieldReadFunction<any>,
	canonicalUrl?: FieldPolicy<any> | FieldReadFunction<any>,
	coAuthors?: FieldPolicy<any> | FieldReadFunction<any>,
	commenters?: FieldPolicy<any> | FieldReadFunction<any>,
	comments?: FieldPolicy<any> | FieldReadFunction<any>,
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	contributors?: FieldPolicy<any> | FieldReadFunction<any>,
	coverImage?: FieldPolicy<any> | FieldReadFunction<any>,
	cuid?: FieldPolicy<any> | FieldReadFunction<any>,
	featured?: FieldPolicy<any> | FieldReadFunction<any>,
	featuredAt?: FieldPolicy<any> | FieldReadFunction<any>,
	features?: FieldPolicy<any> | FieldReadFunction<any>,
	hasLatexInPost?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	isAutoPublishedFromRSS?: FieldPolicy<any> | FieldReadFunction<any>,
	isFollowed?: FieldPolicy<any> | FieldReadFunction<any>,
	likedBy?: FieldPolicy<any> | FieldReadFunction<any>,
	ogMetaData?: FieldPolicy<any> | FieldReadFunction<any>,
	preferences?: FieldPolicy<any> | FieldReadFunction<any>,
	publication?: FieldPolicy<any> | FieldReadFunction<any>,
	publishedAt?: FieldPolicy<any> | FieldReadFunction<any>,
	reactionCount?: FieldPolicy<any> | FieldReadFunction<any>,
	readTimeInMinutes?: FieldPolicy<any> | FieldReadFunction<any>,
	replyCount?: FieldPolicy<any> | FieldReadFunction<any>,
	responseCount?: FieldPolicy<any> | FieldReadFunction<any>,
	seo?: FieldPolicy<any> | FieldReadFunction<any>,
	series?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	subtitle?: FieldPolicy<any> | FieldReadFunction<any>,
	tags?: FieldPolicy<any> | FieldReadFunction<any>,
	title?: FieldPolicy<any> | FieldReadFunction<any>,
	updatedAt?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>,
	views?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostBadgeKeySpecifier = ('id' | 'type' | PostBadgeKeySpecifier)[];
export type PostBadgeFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	type?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostBadgesFeatureKeySpecifier = ('isEnabled' | 'items' | PostBadgesFeatureKeySpecifier)[];
export type PostBadgesFeatureFieldPolicy = {
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	items?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostCommentConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | PostCommentConnectionKeySpecifier)[];
export type PostCommentConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostCommentEdgeKeySpecifier = ('cursor' | 'node' | PostCommentEdgeKeySpecifier)[];
export type PostCommentEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostCommenterConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | PostCommenterConnectionKeySpecifier)[];
export type PostCommenterConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostCommenterEdgeKeySpecifier = ('cursor' | 'node' | PostCommenterEdgeKeySpecifier)[];
export type PostCommenterEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostCoverImageKeySpecifier = ('attribution' | 'isAttributionHidden' | 'isPortrait' | 'photographer' | 'url' | PostCoverImageKeySpecifier)[];
export type PostCoverImageFieldPolicy = {
	attribution?: FieldPolicy<any> | FieldReadFunction<any>,
	isAttributionHidden?: FieldPolicy<any> | FieldReadFunction<any>,
	isPortrait?: FieldPolicy<any> | FieldReadFunction<any>,
	photographer?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostEdgeKeySpecifier = ('cursor' | 'node' | PostEdgeKeySpecifier)[];
export type PostEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostFeaturesKeySpecifier = ('badges' | 'tableOfContents' | PostFeaturesKeySpecifier)[];
export type PostFeaturesFieldPolicy = {
	badges?: FieldPolicy<any> | FieldReadFunction<any>,
	tableOfContents?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostLikerConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | PostLikerConnectionKeySpecifier)[];
export type PostLikerConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostLikerEdgeKeySpecifier = ('cursor' | 'node' | 'reactionCount' | PostLikerEdgeKeySpecifier)[];
export type PostLikerEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>,
	reactionCount?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PostPreferencesKeySpecifier = ('disableComments' | 'isDelisted' | 'pinnedToBlog' | 'stickCoverToBottom' | PostPreferencesKeySpecifier)[];
export type PostPreferencesFieldPolicy = {
	disableComments?: FieldPolicy<any> | FieldReadFunction<any>,
	isDelisted?: FieldPolicy<any> | FieldReadFunction<any>,
	pinnedToBlog?: FieldPolicy<any> | FieldReadFunction<any>,
	stickCoverToBottom?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PreferencesKeySpecifier = ('darkMode' | 'disableFooterBranding' | 'enabledPages' | 'isSubscriptionModalDisabled' | 'layout' | 'logo' | 'navbarItems' | PreferencesKeySpecifier)[];
export type PreferencesFieldPolicy = {
	darkMode?: FieldPolicy<any> | FieldReadFunction<any>,
	disableFooterBranding?: FieldPolicy<any> | FieldReadFunction<any>,
	enabledPages?: FieldPolicy<any> | FieldReadFunction<any>,
	isSubscriptionModalDisabled?: FieldPolicy<any> | FieldReadFunction<any>,
	layout?: FieldPolicy<any> | FieldReadFunction<any>,
	logo?: FieldPolicy<any> | FieldReadFunction<any>,
	navbarItems?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationKeySpecifier = ('about' | 'author' | 'canonicalURL' | 'descriptionSEO' | 'displayTitle' | 'domainInfo' | 'drafts' | 'emailImport' | 'favicon' | 'features' | 'followersCount' | 'hasBadges' | 'headerColor' | 'id' | 'imprint' | 'imprintV2' | 'integrations' | 'isGitHubBackupEnabled' | 'isHeadless' | 'isTeam' | 'links' | 'metaTags' | 'ogMetaData' | 'pinnedPost' | 'post' | 'posts' | 'preferences' | 'recommendedPublications' | 'recommendingPublications' | 'redirectionRules' | 'scheduledDrafts' | 'series' | 'seriesList' | 'sponsorship' | 'staticPage' | 'staticPages' | 'submittedDrafts' | 'title' | 'totalRecommendedPublications' | 'url' | 'urlPattern' | PublicationKeySpecifier)[];
export type PublicationFieldPolicy = {
	about?: FieldPolicy<any> | FieldReadFunction<any>,
	author?: FieldPolicy<any> | FieldReadFunction<any>,
	canonicalURL?: FieldPolicy<any> | FieldReadFunction<any>,
	descriptionSEO?: FieldPolicy<any> | FieldReadFunction<any>,
	displayTitle?: FieldPolicy<any> | FieldReadFunction<any>,
	domainInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	drafts?: FieldPolicy<any> | FieldReadFunction<any>,
	emailImport?: FieldPolicy<any> | FieldReadFunction<any>,
	favicon?: FieldPolicy<any> | FieldReadFunction<any>,
	features?: FieldPolicy<any> | FieldReadFunction<any>,
	followersCount?: FieldPolicy<any> | FieldReadFunction<any>,
	hasBadges?: FieldPolicy<any> | FieldReadFunction<any>,
	headerColor?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	imprint?: FieldPolicy<any> | FieldReadFunction<any>,
	imprintV2?: FieldPolicy<any> | FieldReadFunction<any>,
	integrations?: FieldPolicy<any> | FieldReadFunction<any>,
	isGitHubBackupEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	isHeadless?: FieldPolicy<any> | FieldReadFunction<any>,
	isTeam?: FieldPolicy<any> | FieldReadFunction<any>,
	links?: FieldPolicy<any> | FieldReadFunction<any>,
	metaTags?: FieldPolicy<any> | FieldReadFunction<any>,
	ogMetaData?: FieldPolicy<any> | FieldReadFunction<any>,
	pinnedPost?: FieldPolicy<any> | FieldReadFunction<any>,
	post?: FieldPolicy<any> | FieldReadFunction<any>,
	posts?: FieldPolicy<any> | FieldReadFunction<any>,
	preferences?: FieldPolicy<any> | FieldReadFunction<any>,
	recommendedPublications?: FieldPolicy<any> | FieldReadFunction<any>,
	recommendingPublications?: FieldPolicy<any> | FieldReadFunction<any>,
	redirectionRules?: FieldPolicy<any> | FieldReadFunction<any>,
	scheduledDrafts?: FieldPolicy<any> | FieldReadFunction<any>,
	series?: FieldPolicy<any> | FieldReadFunction<any>,
	seriesList?: FieldPolicy<any> | FieldReadFunction<any>,
	sponsorship?: FieldPolicy<any> | FieldReadFunction<any>,
	staticPage?: FieldPolicy<any> | FieldReadFunction<any>,
	staticPages?: FieldPolicy<any> | FieldReadFunction<any>,
	submittedDrafts?: FieldPolicy<any> | FieldReadFunction<any>,
	title?: FieldPolicy<any> | FieldReadFunction<any>,
	totalRecommendedPublications?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>,
	urlPattern?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationFeaturesKeySpecifier = ('audioBlog' | 'customCSS' | 'newsletter' | 'readTime' | 'textSelectionSharer' | 'viewCount' | PublicationFeaturesKeySpecifier)[];
export type PublicationFeaturesFieldPolicy = {
	audioBlog?: FieldPolicy<any> | FieldReadFunction<any>,
	customCSS?: FieldPolicy<any> | FieldReadFunction<any>,
	newsletter?: FieldPolicy<any> | FieldReadFunction<any>,
	readTime?: FieldPolicy<any> | FieldReadFunction<any>,
	textSelectionSharer?: FieldPolicy<any> | FieldReadFunction<any>,
	viewCount?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationIntegrationsKeySpecifier = ('fathomCustomDomain' | 'fathomCustomDomainEnabled' | 'fathomSiteID' | 'fbPixelID' | 'gTagManagerID' | 'gaTrackingID' | 'hotjarSiteID' | 'matomoSiteID' | 'matomoURL' | 'plausibleAnalyticsEnabled' | 'umamiWebsiteUUID' | 'wmPaymentPointer' | PublicationIntegrationsKeySpecifier)[];
export type PublicationIntegrationsFieldPolicy = {
	fathomCustomDomain?: FieldPolicy<any> | FieldReadFunction<any>,
	fathomCustomDomainEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	fathomSiteID?: FieldPolicy<any> | FieldReadFunction<any>,
	fbPixelID?: FieldPolicy<any> | FieldReadFunction<any>,
	gTagManagerID?: FieldPolicy<any> | FieldReadFunction<any>,
	gaTrackingID?: FieldPolicy<any> | FieldReadFunction<any>,
	hotjarSiteID?: FieldPolicy<any> | FieldReadFunction<any>,
	matomoSiteID?: FieldPolicy<any> | FieldReadFunction<any>,
	matomoURL?: FieldPolicy<any> | FieldReadFunction<any>,
	plausibleAnalyticsEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	umamiWebsiteUUID?: FieldPolicy<any> | FieldReadFunction<any>,
	wmPaymentPointer?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationLinksKeySpecifier = ('dailydev' | 'github' | 'hashnode' | 'instagram' | 'linkedin' | 'mastodon' | 'twitter' | 'website' | 'youtube' | PublicationLinksKeySpecifier)[];
export type PublicationLinksFieldPolicy = {
	dailydev?: FieldPolicy<any> | FieldReadFunction<any>,
	github?: FieldPolicy<any> | FieldReadFunction<any>,
	hashnode?: FieldPolicy<any> | FieldReadFunction<any>,
	instagram?: FieldPolicy<any> | FieldReadFunction<any>,
	linkedin?: FieldPolicy<any> | FieldReadFunction<any>,
	mastodon?: FieldPolicy<any> | FieldReadFunction<any>,
	twitter?: FieldPolicy<any> | FieldReadFunction<any>,
	website?: FieldPolicy<any> | FieldReadFunction<any>,
	youtube?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationNavbarItemKeySpecifier = ('id' | 'label' | 'page' | 'priority' | 'series' | 'type' | 'url' | PublicationNavbarItemKeySpecifier)[];
export type PublicationNavbarItemFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	label?: FieldPolicy<any> | FieldReadFunction<any>,
	page?: FieldPolicy<any> | FieldReadFunction<any>,
	priority?: FieldPolicy<any> | FieldReadFunction<any>,
	series?: FieldPolicy<any> | FieldReadFunction<any>,
	type?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationPostConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | PublicationPostConnectionKeySpecifier)[];
export type PublicationPostConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationSponsorshipKeySpecifier = ('content' | 'stripe' | PublicationSponsorshipKeySpecifier)[];
export type PublicationSponsorshipFieldPolicy = {
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	stripe?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublicationUserRecommendingPublicationConnectionKeySpecifier = ('edges' | 'nodes' | 'pageInfo' | 'totalDocuments' | PublicationUserRecommendingPublicationConnectionKeySpecifier)[];
export type PublicationUserRecommendingPublicationConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	nodes?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublishDraftPayloadKeySpecifier = ('post' | PublishDraftPayloadKeySpecifier)[];
export type PublishDraftPayloadFieldPolicy = {
	post?: FieldPolicy<any> | FieldReadFunction<any>
};
export type PublishPostPayloadKeySpecifier = ('post' | PublishPostPayloadKeySpecifier)[];
export type PublishPostPayloadFieldPolicy = {
	post?: FieldPolicy<any> | FieldReadFunction<any>
};
export type QueryKeySpecifier = ('draft' | 'feed' | 'me' | 'post' | 'publication' | 'scheduledPost' | 'searchPostsOfPublication' | 'tag' | 'topCommenters' | 'user' | QueryKeySpecifier)[];
export type QueryFieldPolicy = {
	draft?: FieldPolicy<any> | FieldReadFunction<any>,
	feed?: FieldPolicy<any> | FieldReadFunction<any>,
	me?: FieldPolicy<any> | FieldReadFunction<any>,
	post?: FieldPolicy<any> | FieldReadFunction<any>,
	publication?: FieldPolicy<any> | FieldReadFunction<any>,
	scheduledPost?: FieldPolicy<any> | FieldReadFunction<any>,
	searchPostsOfPublication?: FieldPolicy<any> | FieldReadFunction<any>,
	tag?: FieldPolicy<any> | FieldReadFunction<any>,
	topCommenters?: FieldPolicy<any> | FieldReadFunction<any>,
	user?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RSSImportKeySpecifier = ('id' | 'rssURL' | RSSImportKeySpecifier)[];
export type RSSImportFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	rssURL?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ReadTimeFeatureKeySpecifier = ('isEnabled' | ReadTimeFeatureKeySpecifier)[];
export type ReadTimeFeatureFieldPolicy = {
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RecommendPublicationsPayloadKeySpecifier = ('recommendedPublications' | RecommendPublicationsPayloadKeySpecifier)[];
export type RecommendPublicationsPayloadFieldPolicy = {
	recommendedPublications?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RecommendedPublicationEdgeKeySpecifier = ('cursor' | 'node' | RecommendedPublicationEdgeKeySpecifier)[];
export type RecommendedPublicationEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RedirectionRuleKeySpecifier = ('destination' | 'source' | 'type' | RedirectionRuleKeySpecifier)[];
export type RedirectionRuleFieldPolicy = {
	destination?: FieldPolicy<any> | FieldReadFunction<any>,
	source?: FieldPolicy<any> | FieldReadFunction<any>,
	type?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RemoveCommentPayloadKeySpecifier = ('comment' | RemoveCommentPayloadKeySpecifier)[];
export type RemoveCommentPayloadFieldPolicy = {
	comment?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RemovePostPayloadKeySpecifier = ('post' | RemovePostPayloadKeySpecifier)[];
export type RemovePostPayloadFieldPolicy = {
	post?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RemoveRecommendationPayloadKeySpecifier = ('recommendedPublication' | RemoveRecommendationPayloadKeySpecifier)[];
export type RemoveRecommendationPayloadFieldPolicy = {
	recommendedPublication?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RemoveReplyPayloadKeySpecifier = ('reply' | RemoveReplyPayloadKeySpecifier)[];
export type RemoveReplyPayloadFieldPolicy = {
	reply?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ReplyKeySpecifier = ('author' | 'content' | 'dateAdded' | 'id' | 'myTotalReactions' | 'stamp' | 'totalReactions' | ReplyKeySpecifier)[];
export type ReplyFieldPolicy = {
	author?: FieldPolicy<any> | FieldReadFunction<any>,
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	dateAdded?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	myTotalReactions?: FieldPolicy<any> | FieldReadFunction<any>,
	stamp?: FieldPolicy<any> | FieldReadFunction<any>,
	totalReactions?: FieldPolicy<any> | FieldReadFunction<any>
};
export type RescheduleDraftPayloadKeySpecifier = ('scheduledPost' | RescheduleDraftPayloadKeySpecifier)[];
export type RescheduleDraftPayloadFieldPolicy = {
	scheduledPost?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ResendWebhookRequestPayloadKeySpecifier = ('webhookMessage' | ResendWebhookRequestPayloadKeySpecifier)[];
export type ResendWebhookRequestPayloadFieldPolicy = {
	webhookMessage?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SEOKeySpecifier = ('description' | 'title' | SEOKeySpecifier)[];
export type SEOFieldPolicy = {
	description?: FieldPolicy<any> | FieldReadFunction<any>,
	title?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ScheduleDraftPayloadKeySpecifier = ('scheduledPost' | ScheduleDraftPayloadKeySpecifier)[];
export type ScheduleDraftPayloadFieldPolicy = {
	scheduledPost?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ScheduledPostKeySpecifier = ('author' | 'draft' | 'id' | 'publication' | 'scheduledBy' | 'scheduledDate' | ScheduledPostKeySpecifier)[];
export type ScheduledPostFieldPolicy = {
	author?: FieldPolicy<any> | FieldReadFunction<any>,
	draft?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	publication?: FieldPolicy<any> | FieldReadFunction<any>,
	scheduledBy?: FieldPolicy<any> | FieldReadFunction<any>,
	scheduledDate?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SearchPostConnectionKeySpecifier = ('edges' | 'pageInfo' | SearchPostConnectionKeySpecifier)[];
export type SearchPostConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SeriesKeySpecifier = ('author' | 'coverImage' | 'createdAt' | 'cuid' | 'description' | 'id' | 'name' | 'posts' | 'slug' | 'sortOrder' | SeriesKeySpecifier)[];
export type SeriesFieldPolicy = {
	author?: FieldPolicy<any> | FieldReadFunction<any>,
	coverImage?: FieldPolicy<any> | FieldReadFunction<any>,
	createdAt?: FieldPolicy<any> | FieldReadFunction<any>,
	cuid?: FieldPolicy<any> | FieldReadFunction<any>,
	description?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	posts?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	sortOrder?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SeriesConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | SeriesConnectionKeySpecifier)[];
export type SeriesConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SeriesEdgeKeySpecifier = ('cursor' | 'node' | SeriesEdgeKeySpecifier)[];
export type SeriesEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SeriesPostConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | SeriesPostConnectionKeySpecifier)[];
export type SeriesPostConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SocialMediaLinksKeySpecifier = ('facebook' | 'github' | 'instagram' | 'linkedin' | 'stackoverflow' | 'twitter' | 'website' | 'youtube' | SocialMediaLinksKeySpecifier)[];
export type SocialMediaLinksFieldPolicy = {
	facebook?: FieldPolicy<any> | FieldReadFunction<any>,
	github?: FieldPolicy<any> | FieldReadFunction<any>,
	instagram?: FieldPolicy<any> | FieldReadFunction<any>,
	linkedin?: FieldPolicy<any> | FieldReadFunction<any>,
	stackoverflow?: FieldPolicy<any> | FieldReadFunction<any>,
	twitter?: FieldPolicy<any> | FieldReadFunction<any>,
	website?: FieldPolicy<any> | FieldReadFunction<any>,
	youtube?: FieldPolicy<any> | FieldReadFunction<any>
};
export type StaticPageKeySpecifier = ('content' | 'hidden' | 'id' | 'ogMetaData' | 'seo' | 'slug' | 'title' | StaticPageKeySpecifier)[];
export type StaticPageFieldPolicy = {
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	hidden?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	ogMetaData?: FieldPolicy<any> | FieldReadFunction<any>,
	seo?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	title?: FieldPolicy<any> | FieldReadFunction<any>
};
export type StaticPageConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | StaticPageConnectionKeySpecifier)[];
export type StaticPageConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type StaticPageEdgeKeySpecifier = ('cursor' | 'node' | StaticPageEdgeKeySpecifier)[];
export type StaticPageEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type StripeConfigurationKeySpecifier = ('accountId' | 'connected' | 'country' | StripeConfigurationKeySpecifier)[];
export type StripeConfigurationFieldPolicy = {
	accountId?: FieldPolicy<any> | FieldReadFunction<any>,
	connected?: FieldPolicy<any> | FieldReadFunction<any>,
	country?: FieldPolicy<any> | FieldReadFunction<any>
};
export type SubscribeToNewsletterPayloadKeySpecifier = ('status' | SubscribeToNewsletterPayloadKeySpecifier)[];
export type SubscribeToNewsletterPayloadFieldPolicy = {
	status?: FieldPolicy<any> | FieldReadFunction<any>
};
export type TableOfContentsFeatureKeySpecifier = ('isEnabled' | 'items' | TableOfContentsFeatureKeySpecifier)[];
export type TableOfContentsFeatureFieldPolicy = {
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>,
	items?: FieldPolicy<any> | FieldReadFunction<any>
};
export type TableOfContentsItemKeySpecifier = ('id' | 'level' | 'parentId' | 'slug' | 'title' | TableOfContentsItemKeySpecifier)[];
export type TableOfContentsItemFieldPolicy = {
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	level?: FieldPolicy<any> | FieldReadFunction<any>,
	parentId?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	title?: FieldPolicy<any> | FieldReadFunction<any>
};
export type TagKeySpecifier = ('followersCount' | 'id' | 'info' | 'logo' | 'name' | 'posts' | 'postsCount' | 'slug' | 'tagline' | TagKeySpecifier)[];
export type TagFieldPolicy = {
	followersCount?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	info?: FieldPolicy<any> | FieldReadFunction<any>,
	logo?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	posts?: FieldPolicy<any> | FieldReadFunction<any>,
	postsCount?: FieldPolicy<any> | FieldReadFunction<any>,
	slug?: FieldPolicy<any> | FieldReadFunction<any>,
	tagline?: FieldPolicy<any> | FieldReadFunction<any>
};
export type TagEdgeKeySpecifier = ('cursor' | 'node' | TagEdgeKeySpecifier)[];
export type TagEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type TextSelectionSharerFeatureKeySpecifier = ('isEnabled' | TextSelectionSharerFeatureKeySpecifier)[];
export type TextSelectionSharerFeatureFieldPolicy = {
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ToggleFollowUserPayloadKeySpecifier = ('user' | ToggleFollowUserPayloadKeySpecifier)[];
export type ToggleFollowUserPayloadFieldPolicy = {
	user?: FieldPolicy<any> | FieldReadFunction<any>
};
export type TriggerWebhookTestPayloadKeySpecifier = ('webhook' | TriggerWebhookTestPayloadKeySpecifier)[];
export type TriggerWebhookTestPayloadFieldPolicy = {
	webhook?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UnsubscribeFromNewsletterPayloadKeySpecifier = ('status' | UnsubscribeFromNewsletterPayloadKeySpecifier)[];
export type UnsubscribeFromNewsletterPayloadFieldPolicy = {
	status?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UpdateCommentPayloadKeySpecifier = ('comment' | UpdateCommentPayloadKeySpecifier)[];
export type UpdateCommentPayloadFieldPolicy = {
	comment?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UpdatePostPayloadKeySpecifier = ('post' | UpdatePostPayloadKeySpecifier)[];
export type UpdatePostPayloadFieldPolicy = {
	post?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UpdateReplyPayloadKeySpecifier = ('reply' | UpdateReplyPayloadKeySpecifier)[];
export type UpdateReplyPayloadFieldPolicy = {
	reply?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UpdateWebhookPayloadKeySpecifier = ('webhook' | UpdateWebhookPayloadKeySpecifier)[];
export type UpdateWebhookPayloadFieldPolicy = {
	webhook?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserKeySpecifier = ('ambassador' | 'availableFor' | 'badges' | 'bio' | 'bioV2' | 'dateJoined' | 'deactivated' | 'followers' | 'followersCount' | 'following' | 'followingsCount' | 'follows' | 'followsBack' | 'id' | 'isPro' | 'location' | 'name' | 'posts' | 'profilePicture' | 'publications' | 'socialMediaLinks' | 'tagline' | 'tagsFollowing' | 'username' | UserKeySpecifier)[];
export type UserFieldPolicy = {
	ambassador?: FieldPolicy<any> | FieldReadFunction<any>,
	availableFor?: FieldPolicy<any> | FieldReadFunction<any>,
	badges?: FieldPolicy<any> | FieldReadFunction<any>,
	bio?: FieldPolicy<any> | FieldReadFunction<any>,
	bioV2?: FieldPolicy<any> | FieldReadFunction<any>,
	dateJoined?: FieldPolicy<any> | FieldReadFunction<any>,
	deactivated?: FieldPolicy<any> | FieldReadFunction<any>,
	followers?: FieldPolicy<any> | FieldReadFunction<any>,
	followersCount?: FieldPolicy<any> | FieldReadFunction<any>,
	following?: FieldPolicy<any> | FieldReadFunction<any>,
	followingsCount?: FieldPolicy<any> | FieldReadFunction<any>,
	follows?: FieldPolicy<any> | FieldReadFunction<any>,
	followsBack?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	isPro?: FieldPolicy<any> | FieldReadFunction<any>,
	location?: FieldPolicy<any> | FieldReadFunction<any>,
	name?: FieldPolicy<any> | FieldReadFunction<any>,
	posts?: FieldPolicy<any> | FieldReadFunction<any>,
	profilePicture?: FieldPolicy<any> | FieldReadFunction<any>,
	publications?: FieldPolicy<any> | FieldReadFunction<any>,
	socialMediaLinks?: FieldPolicy<any> | FieldReadFunction<any>,
	tagline?: FieldPolicy<any> | FieldReadFunction<any>,
	tagsFollowing?: FieldPolicy<any> | FieldReadFunction<any>,
	username?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserConnectionKeySpecifier = ('nodes' | 'pageInfo' | 'totalDocuments' | UserConnectionKeySpecifier)[];
export type UserConnectionFieldPolicy = {
	nodes?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserEdgeKeySpecifier = ('cursor' | 'node' | UserEdgeKeySpecifier)[];
export type UserEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserPostConnectionKeySpecifier = ('edges' | 'nodes' | 'pageInfo' | 'totalDocuments' | UserPostConnectionKeySpecifier)[];
export type UserPostConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	nodes?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserPostEdgeKeySpecifier = ('authorType' | 'node' | UserPostEdgeKeySpecifier)[];
export type UserPostEdgeFieldPolicy = {
	authorType?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserPublicationsConnectionKeySpecifier = ('edges' | 'pageInfo' | 'totalDocuments' | UserPublicationsConnectionKeySpecifier)[];
export type UserPublicationsConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>,
	totalDocuments?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserPublicationsEdgeKeySpecifier = ('cursor' | 'node' | 'role' | UserPublicationsEdgeKeySpecifier)[];
export type UserPublicationsEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>,
	role?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserRecommendedPublicationEdgeKeySpecifier = ('node' | 'totalFollowersGained' | UserRecommendedPublicationEdgeKeySpecifier)[];
export type UserRecommendedPublicationEdgeFieldPolicy = {
	node?: FieldPolicy<any> | FieldReadFunction<any>,
	totalFollowersGained?: FieldPolicy<any> | FieldReadFunction<any>
};
export type UserRecommendingPublicationEdgeKeySpecifier = ('node' | 'totalFollowersGained' | UserRecommendingPublicationEdgeKeySpecifier)[];
export type UserRecommendingPublicationEdgeFieldPolicy = {
	node?: FieldPolicy<any> | FieldReadFunction<any>,
	totalFollowersGained?: FieldPolicy<any> | FieldReadFunction<any>
};
export type ViewCountFeatureKeySpecifier = ('isEnabled' | ViewCountFeatureKeySpecifier)[];
export type ViewCountFeatureFieldPolicy = {
	isEnabled?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WebhookKeySpecifier = ('createdAt' | 'events' | 'id' | 'messages' | 'publication' | 'secret' | 'updatedAt' | 'url' | WebhookKeySpecifier)[];
export type WebhookFieldPolicy = {
	createdAt?: FieldPolicy<any> | FieldReadFunction<any>,
	events?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	messages?: FieldPolicy<any> | FieldReadFunction<any>,
	publication?: FieldPolicy<any> | FieldReadFunction<any>,
	secret?: FieldPolicy<any> | FieldReadFunction<any>,
	updatedAt?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WebhookMessageKeySpecifier = ('createdAt' | 'event' | 'id' | 'isError' | 'isResent' | 'isTest' | 'request' | 'response' | 'url' | WebhookMessageKeySpecifier)[];
export type WebhookMessageFieldPolicy = {
	createdAt?: FieldPolicy<any> | FieldReadFunction<any>,
	event?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	isError?: FieldPolicy<any> | FieldReadFunction<any>,
	isResent?: FieldPolicy<any> | FieldReadFunction<any>,
	isTest?: FieldPolicy<any> | FieldReadFunction<any>,
	request?: FieldPolicy<any> | FieldReadFunction<any>,
	response?: FieldPolicy<any> | FieldReadFunction<any>,
	url?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WebhookMessageConnectionKeySpecifier = ('edges' | 'pageInfo' | WebhookMessageConnectionKeySpecifier)[];
export type WebhookMessageConnectionFieldPolicy = {
	edges?: FieldPolicy<any> | FieldReadFunction<any>,
	pageInfo?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WebhookMessageEdgeKeySpecifier = ('cursor' | 'node' | WebhookMessageEdgeKeySpecifier)[];
export type WebhookMessageEdgeFieldPolicy = {
	cursor?: FieldPolicy<any> | FieldReadFunction<any>,
	node?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WebhookMessageRequestKeySpecifier = ('body' | 'error' | 'headers' | 'uuid' | WebhookMessageRequestKeySpecifier)[];
export type WebhookMessageRequestFieldPolicy = {
	body?: FieldPolicy<any> | FieldReadFunction<any>,
	error?: FieldPolicy<any> | FieldReadFunction<any>,
	headers?: FieldPolicy<any> | FieldReadFunction<any>,
	uuid?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WebhookMessageRequestErrorKeySpecifier = ('code' | 'message' | WebhookMessageRequestErrorKeySpecifier)[];
export type WebhookMessageRequestErrorFieldPolicy = {
	code?: FieldPolicy<any> | FieldReadFunction<any>,
	message?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WebhookMessageResponseKeySpecifier = ('body' | 'headers' | 'httpStatus' | 'timeToFirstByteMilliseconds' | WebhookMessageResponseKeySpecifier)[];
export type WebhookMessageResponseFieldPolicy = {
	body?: FieldPolicy<any> | FieldReadFunction<any>,
	headers?: FieldPolicy<any> | FieldReadFunction<any>,
	httpStatus?: FieldPolicy<any> | FieldReadFunction<any>,
	timeToFirstByteMilliseconds?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WidgetKeySpecifier = ('content' | 'createdAt' | 'id' | 'pinSettings' | 'widgetId' | WidgetKeySpecifier)[];
export type WidgetFieldPolicy = {
	content?: FieldPolicy<any> | FieldReadFunction<any>,
	createdAt?: FieldPolicy<any> | FieldReadFunction<any>,
	id?: FieldPolicy<any> | FieldReadFunction<any>,
	pinSettings?: FieldPolicy<any> | FieldReadFunction<any>,
	widgetId?: FieldPolicy<any> | FieldReadFunction<any>
};
export type WidgetPinSettingsKeySpecifier = ('isPinned' | 'location' | WidgetPinSettingsKeySpecifier)[];
export type WidgetPinSettingsFieldPolicy = {
	isPinned?: FieldPolicy<any> | FieldReadFunction<any>,
	location?: FieldPolicy<any> | FieldReadFunction<any>
};
export type StrictTypedTypePolicies = {
	AddCommentPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | AddCommentPayloadKeySpecifier | (() => undefined | AddCommentPayloadKeySpecifier),
		fields?: AddCommentPayloadFieldPolicy,
	},
	AddPostToSeriesPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | AddPostToSeriesPayloadKeySpecifier | (() => undefined | AddPostToSeriesPayloadKeySpecifier),
		fields?: AddPostToSeriesPayloadFieldPolicy,
	},
	AddReplyPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | AddReplyPayloadKeySpecifier | (() => undefined | AddReplyPayloadKeySpecifier),
		fields?: AddReplyPayloadFieldPolicy,
	},
	AudioBlogFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | AudioBlogFeatureKeySpecifier | (() => undefined | AudioBlogFeatureKeySpecifier),
		fields?: AudioBlogFeatureFieldPolicy,
	},
	AudioUrls?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | AudioUrlsKeySpecifier | (() => undefined | AudioUrlsKeySpecifier),
		fields?: AudioUrlsFieldPolicy,
	},
	Badge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | BadgeKeySpecifier | (() => undefined | BadgeKeySpecifier),
		fields?: BadgeFieldPolicy,
	},
	BetaFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | BetaFeatureKeySpecifier | (() => undefined | BetaFeatureKeySpecifier),
		fields?: BetaFeatureFieldPolicy,
	},
	CancelScheduledDraftPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CancelScheduledDraftPayloadKeySpecifier | (() => undefined | CancelScheduledDraftPayloadKeySpecifier),
		fields?: CancelScheduledDraftPayloadFieldPolicy,
	},
	Comment?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CommentKeySpecifier | (() => undefined | CommentKeySpecifier),
		fields?: CommentFieldPolicy,
	},
	CommentReplyConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CommentReplyConnectionKeySpecifier | (() => undefined | CommentReplyConnectionKeySpecifier),
		fields?: CommentReplyConnectionFieldPolicy,
	},
	CommentReplyEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CommentReplyEdgeKeySpecifier | (() => undefined | CommentReplyEdgeKeySpecifier),
		fields?: CommentReplyEdgeFieldPolicy,
	},
	CommenterUserConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CommenterUserConnectionKeySpecifier | (() => undefined | CommenterUserConnectionKeySpecifier),
		fields?: CommenterUserConnectionFieldPolicy,
	},
	Connection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ConnectionKeySpecifier | (() => undefined | ConnectionKeySpecifier),
		fields?: ConnectionFieldPolicy,
	},
	Content?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ContentKeySpecifier | (() => undefined | ContentKeySpecifier),
		fields?: ContentFieldPolicy,
	},
	CreateWebhookPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CreateWebhookPayloadKeySpecifier | (() => undefined | CreateWebhookPayloadKeySpecifier),
		fields?: CreateWebhookPayloadFieldPolicy,
	},
	CustomCSS?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CustomCSSKeySpecifier | (() => undefined | CustomCSSKeySpecifier),
		fields?: CustomCSSFieldPolicy,
	},
	CustomCSSFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | CustomCSSFeatureKeySpecifier | (() => undefined | CustomCSSFeatureKeySpecifier),
		fields?: CustomCSSFeatureFieldPolicy,
	},
	DarkModePreferences?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DarkModePreferencesKeySpecifier | (() => undefined | DarkModePreferencesKeySpecifier),
		fields?: DarkModePreferencesFieldPolicy,
	},
	DeleteWebhookPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DeleteWebhookPayloadKeySpecifier | (() => undefined | DeleteWebhookPayloadKeySpecifier),
		fields?: DeleteWebhookPayloadFieldPolicy,
	},
	DomainInfo?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DomainInfoKeySpecifier | (() => undefined | DomainInfoKeySpecifier),
		fields?: DomainInfoFieldPolicy,
	},
	DomainStatus?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DomainStatusKeySpecifier | (() => undefined | DomainStatusKeySpecifier),
		fields?: DomainStatusFieldPolicy,
	},
	Draft?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftKeySpecifier | (() => undefined | DraftKeySpecifier),
		fields?: DraftFieldPolicy,
	},
	DraftBackup?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftBackupKeySpecifier | (() => undefined | DraftBackupKeySpecifier),
		fields?: DraftBackupFieldPolicy,
	},
	DraftBaseTag?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftBaseTagKeySpecifier | (() => undefined | DraftBaseTagKeySpecifier),
		fields?: DraftBaseTagFieldPolicy,
	},
	DraftConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftConnectionKeySpecifier | (() => undefined | DraftConnectionKeySpecifier),
		fields?: DraftConnectionFieldPolicy,
	},
	DraftCoverImage?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftCoverImageKeySpecifier | (() => undefined | DraftCoverImageKeySpecifier),
		fields?: DraftCoverImageFieldPolicy,
	},
	DraftEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftEdgeKeySpecifier | (() => undefined | DraftEdgeKeySpecifier),
		fields?: DraftEdgeFieldPolicy,
	},
	DraftFeatures?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftFeaturesKeySpecifier | (() => undefined | DraftFeaturesKeySpecifier),
		fields?: DraftFeaturesFieldPolicy,
	},
	DraftSettings?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | DraftSettingsKeySpecifier | (() => undefined | DraftSettingsKeySpecifier),
		fields?: DraftSettingsFieldPolicy,
	},
	Edge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | EdgeKeySpecifier | (() => undefined | EdgeKeySpecifier),
		fields?: EdgeFieldPolicy,
	},
	EmailCurrentImport?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | EmailCurrentImportKeySpecifier | (() => undefined | EmailCurrentImportKeySpecifier),
		fields?: EmailCurrentImportFieldPolicy,
	},
	EmailImport?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | EmailImportKeySpecifier | (() => undefined | EmailImportKeySpecifier),
		fields?: EmailImportFieldPolicy,
	},
	Feature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | FeatureKeySpecifier | (() => undefined | FeatureKeySpecifier),
		fields?: FeatureFieldPolicy,
	},
	FeedPostConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | FeedPostConnectionKeySpecifier | (() => undefined | FeedPostConnectionKeySpecifier),
		fields?: FeedPostConnectionFieldPolicy,
	},
	ITag?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ITagKeySpecifier | (() => undefined | ITagKeySpecifier),
		fields?: ITagFieldPolicy,
	},
	IUser?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | IUserKeySpecifier | (() => undefined | IUserKeySpecifier),
		fields?: IUserFieldPolicy,
	},
	LikeCommentPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | LikeCommentPayloadKeySpecifier | (() => undefined | LikeCommentPayloadKeySpecifier),
		fields?: LikeCommentPayloadFieldPolicy,
	},
	LikePostPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | LikePostPayloadKeySpecifier | (() => undefined | LikePostPayloadKeySpecifier),
		fields?: LikePostPayloadFieldPolicy,
	},
	Mutation?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | MutationKeySpecifier | (() => undefined | MutationKeySpecifier),
		fields?: MutationFieldPolicy,
	},
	MyUser?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | MyUserKeySpecifier | (() => undefined | MyUserKeySpecifier),
		fields?: MyUserFieldPolicy,
	},
	NewsletterFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | NewsletterFeatureKeySpecifier | (() => undefined | NewsletterFeatureKeySpecifier),
		fields?: NewsletterFeatureFieldPolicy,
	},
	Node?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | NodeKeySpecifier | (() => undefined | NodeKeySpecifier),
		fields?: NodeFieldPolicy,
	},
	OffsetPageInfo?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | OffsetPageInfoKeySpecifier | (() => undefined | OffsetPageInfoKeySpecifier),
		fields?: OffsetPageInfoFieldPolicy,
	},
	OpenGraphMetaData?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | OpenGraphMetaDataKeySpecifier | (() => undefined | OpenGraphMetaDataKeySpecifier),
		fields?: OpenGraphMetaDataFieldPolicy,
	},
	PageConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PageConnectionKeySpecifier | (() => undefined | PageConnectionKeySpecifier),
		fields?: PageConnectionFieldPolicy,
	},
	PageInfo?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PageInfoKeySpecifier | (() => undefined | PageInfoKeySpecifier),
		fields?: PageInfoFieldPolicy,
	},
	PagesPreferences?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PagesPreferencesKeySpecifier | (() => undefined | PagesPreferencesKeySpecifier),
		fields?: PagesPreferencesFieldPolicy,
	},
	PopularTag?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PopularTagKeySpecifier | (() => undefined | PopularTagKeySpecifier),
		fields?: PopularTagFieldPolicy,
	},
	PopularTagEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PopularTagEdgeKeySpecifier | (() => undefined | PopularTagEdgeKeySpecifier),
		fields?: PopularTagEdgeFieldPolicy,
	},
	Post?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostKeySpecifier | (() => undefined | PostKeySpecifier),
		fields?: PostFieldPolicy,
	},
	PostBadge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostBadgeKeySpecifier | (() => undefined | PostBadgeKeySpecifier),
		fields?: PostBadgeFieldPolicy,
	},
	PostBadgesFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostBadgesFeatureKeySpecifier | (() => undefined | PostBadgesFeatureKeySpecifier),
		fields?: PostBadgesFeatureFieldPolicy,
	},
	PostCommentConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostCommentConnectionKeySpecifier | (() => undefined | PostCommentConnectionKeySpecifier),
		fields?: PostCommentConnectionFieldPolicy,
	},
	PostCommentEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostCommentEdgeKeySpecifier | (() => undefined | PostCommentEdgeKeySpecifier),
		fields?: PostCommentEdgeFieldPolicy,
	},
	PostCommenterConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostCommenterConnectionKeySpecifier | (() => undefined | PostCommenterConnectionKeySpecifier),
		fields?: PostCommenterConnectionFieldPolicy,
	},
	PostCommenterEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostCommenterEdgeKeySpecifier | (() => undefined | PostCommenterEdgeKeySpecifier),
		fields?: PostCommenterEdgeFieldPolicy,
	},
	PostCoverImage?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostCoverImageKeySpecifier | (() => undefined | PostCoverImageKeySpecifier),
		fields?: PostCoverImageFieldPolicy,
	},
	PostEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostEdgeKeySpecifier | (() => undefined | PostEdgeKeySpecifier),
		fields?: PostEdgeFieldPolicy,
	},
	PostFeatures?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostFeaturesKeySpecifier | (() => undefined | PostFeaturesKeySpecifier),
		fields?: PostFeaturesFieldPolicy,
	},
	PostLikerConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostLikerConnectionKeySpecifier | (() => undefined | PostLikerConnectionKeySpecifier),
		fields?: PostLikerConnectionFieldPolicy,
	},
	PostLikerEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostLikerEdgeKeySpecifier | (() => undefined | PostLikerEdgeKeySpecifier),
		fields?: PostLikerEdgeFieldPolicy,
	},
	PostPreferences?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PostPreferencesKeySpecifier | (() => undefined | PostPreferencesKeySpecifier),
		fields?: PostPreferencesFieldPolicy,
	},
	Preferences?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PreferencesKeySpecifier | (() => undefined | PreferencesKeySpecifier),
		fields?: PreferencesFieldPolicy,
	},
	Publication?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationKeySpecifier | (() => undefined | PublicationKeySpecifier),
		fields?: PublicationFieldPolicy,
	},
	PublicationFeatures?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationFeaturesKeySpecifier | (() => undefined | PublicationFeaturesKeySpecifier),
		fields?: PublicationFeaturesFieldPolicy,
	},
	PublicationIntegrations?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationIntegrationsKeySpecifier | (() => undefined | PublicationIntegrationsKeySpecifier),
		fields?: PublicationIntegrationsFieldPolicy,
	},
	PublicationLinks?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationLinksKeySpecifier | (() => undefined | PublicationLinksKeySpecifier),
		fields?: PublicationLinksFieldPolicy,
	},
	PublicationNavbarItem?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationNavbarItemKeySpecifier | (() => undefined | PublicationNavbarItemKeySpecifier),
		fields?: PublicationNavbarItemFieldPolicy,
	},
	PublicationPostConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationPostConnectionKeySpecifier | (() => undefined | PublicationPostConnectionKeySpecifier),
		fields?: PublicationPostConnectionFieldPolicy,
	},
	PublicationSponsorship?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationSponsorshipKeySpecifier | (() => undefined | PublicationSponsorshipKeySpecifier),
		fields?: PublicationSponsorshipFieldPolicy,
	},
	PublicationUserRecommendingPublicationConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublicationUserRecommendingPublicationConnectionKeySpecifier | (() => undefined | PublicationUserRecommendingPublicationConnectionKeySpecifier),
		fields?: PublicationUserRecommendingPublicationConnectionFieldPolicy,
	},
	PublishDraftPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublishDraftPayloadKeySpecifier | (() => undefined | PublishDraftPayloadKeySpecifier),
		fields?: PublishDraftPayloadFieldPolicy,
	},
	PublishPostPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | PublishPostPayloadKeySpecifier | (() => undefined | PublishPostPayloadKeySpecifier),
		fields?: PublishPostPayloadFieldPolicy,
	},
	Query?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | QueryKeySpecifier | (() => undefined | QueryKeySpecifier),
		fields?: QueryFieldPolicy,
	},
	RSSImport?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RSSImportKeySpecifier | (() => undefined | RSSImportKeySpecifier),
		fields?: RSSImportFieldPolicy,
	},
	ReadTimeFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ReadTimeFeatureKeySpecifier | (() => undefined | ReadTimeFeatureKeySpecifier),
		fields?: ReadTimeFeatureFieldPolicy,
	},
	RecommendPublicationsPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RecommendPublicationsPayloadKeySpecifier | (() => undefined | RecommendPublicationsPayloadKeySpecifier),
		fields?: RecommendPublicationsPayloadFieldPolicy,
	},
	RecommendedPublicationEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RecommendedPublicationEdgeKeySpecifier | (() => undefined | RecommendedPublicationEdgeKeySpecifier),
		fields?: RecommendedPublicationEdgeFieldPolicy,
	},
	RedirectionRule?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RedirectionRuleKeySpecifier | (() => undefined | RedirectionRuleKeySpecifier),
		fields?: RedirectionRuleFieldPolicy,
	},
	RemoveCommentPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RemoveCommentPayloadKeySpecifier | (() => undefined | RemoveCommentPayloadKeySpecifier),
		fields?: RemoveCommentPayloadFieldPolicy,
	},
	RemovePostPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RemovePostPayloadKeySpecifier | (() => undefined | RemovePostPayloadKeySpecifier),
		fields?: RemovePostPayloadFieldPolicy,
	},
	RemoveRecommendationPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RemoveRecommendationPayloadKeySpecifier | (() => undefined | RemoveRecommendationPayloadKeySpecifier),
		fields?: RemoveRecommendationPayloadFieldPolicy,
	},
	RemoveReplyPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RemoveReplyPayloadKeySpecifier | (() => undefined | RemoveReplyPayloadKeySpecifier),
		fields?: RemoveReplyPayloadFieldPolicy,
	},
	Reply?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ReplyKeySpecifier | (() => undefined | ReplyKeySpecifier),
		fields?: ReplyFieldPolicy,
	},
	RescheduleDraftPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | RescheduleDraftPayloadKeySpecifier | (() => undefined | RescheduleDraftPayloadKeySpecifier),
		fields?: RescheduleDraftPayloadFieldPolicy,
	},
	ResendWebhookRequestPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ResendWebhookRequestPayloadKeySpecifier | (() => undefined | ResendWebhookRequestPayloadKeySpecifier),
		fields?: ResendWebhookRequestPayloadFieldPolicy,
	},
	SEO?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SEOKeySpecifier | (() => undefined | SEOKeySpecifier),
		fields?: SEOFieldPolicy,
	},
	ScheduleDraftPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ScheduleDraftPayloadKeySpecifier | (() => undefined | ScheduleDraftPayloadKeySpecifier),
		fields?: ScheduleDraftPayloadFieldPolicy,
	},
	ScheduledPost?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ScheduledPostKeySpecifier | (() => undefined | ScheduledPostKeySpecifier),
		fields?: ScheduledPostFieldPolicy,
	},
	SearchPostConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SearchPostConnectionKeySpecifier | (() => undefined | SearchPostConnectionKeySpecifier),
		fields?: SearchPostConnectionFieldPolicy,
	},
	Series?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SeriesKeySpecifier | (() => undefined | SeriesKeySpecifier),
		fields?: SeriesFieldPolicy,
	},
	SeriesConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SeriesConnectionKeySpecifier | (() => undefined | SeriesConnectionKeySpecifier),
		fields?: SeriesConnectionFieldPolicy,
	},
	SeriesEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SeriesEdgeKeySpecifier | (() => undefined | SeriesEdgeKeySpecifier),
		fields?: SeriesEdgeFieldPolicy,
	},
	SeriesPostConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SeriesPostConnectionKeySpecifier | (() => undefined | SeriesPostConnectionKeySpecifier),
		fields?: SeriesPostConnectionFieldPolicy,
	},
	SocialMediaLinks?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SocialMediaLinksKeySpecifier | (() => undefined | SocialMediaLinksKeySpecifier),
		fields?: SocialMediaLinksFieldPolicy,
	},
	StaticPage?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | StaticPageKeySpecifier | (() => undefined | StaticPageKeySpecifier),
		fields?: StaticPageFieldPolicy,
	},
	StaticPageConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | StaticPageConnectionKeySpecifier | (() => undefined | StaticPageConnectionKeySpecifier),
		fields?: StaticPageConnectionFieldPolicy,
	},
	StaticPageEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | StaticPageEdgeKeySpecifier | (() => undefined | StaticPageEdgeKeySpecifier),
		fields?: StaticPageEdgeFieldPolicy,
	},
	StripeConfiguration?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | StripeConfigurationKeySpecifier | (() => undefined | StripeConfigurationKeySpecifier),
		fields?: StripeConfigurationFieldPolicy,
	},
	SubscribeToNewsletterPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | SubscribeToNewsletterPayloadKeySpecifier | (() => undefined | SubscribeToNewsletterPayloadKeySpecifier),
		fields?: SubscribeToNewsletterPayloadFieldPolicy,
	},
	TableOfContentsFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | TableOfContentsFeatureKeySpecifier | (() => undefined | TableOfContentsFeatureKeySpecifier),
		fields?: TableOfContentsFeatureFieldPolicy,
	},
	TableOfContentsItem?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | TableOfContentsItemKeySpecifier | (() => undefined | TableOfContentsItemKeySpecifier),
		fields?: TableOfContentsItemFieldPolicy,
	},
	Tag?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | TagKeySpecifier | (() => undefined | TagKeySpecifier),
		fields?: TagFieldPolicy,
	},
	TagEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | TagEdgeKeySpecifier | (() => undefined | TagEdgeKeySpecifier),
		fields?: TagEdgeFieldPolicy,
	},
	TextSelectionSharerFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | TextSelectionSharerFeatureKeySpecifier | (() => undefined | TextSelectionSharerFeatureKeySpecifier),
		fields?: TextSelectionSharerFeatureFieldPolicy,
	},
	ToggleFollowUserPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ToggleFollowUserPayloadKeySpecifier | (() => undefined | ToggleFollowUserPayloadKeySpecifier),
		fields?: ToggleFollowUserPayloadFieldPolicy,
	},
	TriggerWebhookTestPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | TriggerWebhookTestPayloadKeySpecifier | (() => undefined | TriggerWebhookTestPayloadKeySpecifier),
		fields?: TriggerWebhookTestPayloadFieldPolicy,
	},
	UnsubscribeFromNewsletterPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UnsubscribeFromNewsletterPayloadKeySpecifier | (() => undefined | UnsubscribeFromNewsletterPayloadKeySpecifier),
		fields?: UnsubscribeFromNewsletterPayloadFieldPolicy,
	},
	UpdateCommentPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UpdateCommentPayloadKeySpecifier | (() => undefined | UpdateCommentPayloadKeySpecifier),
		fields?: UpdateCommentPayloadFieldPolicy,
	},
	UpdatePostPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UpdatePostPayloadKeySpecifier | (() => undefined | UpdatePostPayloadKeySpecifier),
		fields?: UpdatePostPayloadFieldPolicy,
	},
	UpdateReplyPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UpdateReplyPayloadKeySpecifier | (() => undefined | UpdateReplyPayloadKeySpecifier),
		fields?: UpdateReplyPayloadFieldPolicy,
	},
	UpdateWebhookPayload?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UpdateWebhookPayloadKeySpecifier | (() => undefined | UpdateWebhookPayloadKeySpecifier),
		fields?: UpdateWebhookPayloadFieldPolicy,
	},
	User?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserKeySpecifier | (() => undefined | UserKeySpecifier),
		fields?: UserFieldPolicy,
	},
	UserConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserConnectionKeySpecifier | (() => undefined | UserConnectionKeySpecifier),
		fields?: UserConnectionFieldPolicy,
	},
	UserEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserEdgeKeySpecifier | (() => undefined | UserEdgeKeySpecifier),
		fields?: UserEdgeFieldPolicy,
	},
	UserPostConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserPostConnectionKeySpecifier | (() => undefined | UserPostConnectionKeySpecifier),
		fields?: UserPostConnectionFieldPolicy,
	},
	UserPostEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserPostEdgeKeySpecifier | (() => undefined | UserPostEdgeKeySpecifier),
		fields?: UserPostEdgeFieldPolicy,
	},
	UserPublicationsConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserPublicationsConnectionKeySpecifier | (() => undefined | UserPublicationsConnectionKeySpecifier),
		fields?: UserPublicationsConnectionFieldPolicy,
	},
	UserPublicationsEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserPublicationsEdgeKeySpecifier | (() => undefined | UserPublicationsEdgeKeySpecifier),
		fields?: UserPublicationsEdgeFieldPolicy,
	},
	UserRecommendedPublicationEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserRecommendedPublicationEdgeKeySpecifier | (() => undefined | UserRecommendedPublicationEdgeKeySpecifier),
		fields?: UserRecommendedPublicationEdgeFieldPolicy,
	},
	UserRecommendingPublicationEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | UserRecommendingPublicationEdgeKeySpecifier | (() => undefined | UserRecommendingPublicationEdgeKeySpecifier),
		fields?: UserRecommendingPublicationEdgeFieldPolicy,
	},
	ViewCountFeature?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | ViewCountFeatureKeySpecifier | (() => undefined | ViewCountFeatureKeySpecifier),
		fields?: ViewCountFeatureFieldPolicy,
	},
	Webhook?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WebhookKeySpecifier | (() => undefined | WebhookKeySpecifier),
		fields?: WebhookFieldPolicy,
	},
	WebhookMessage?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WebhookMessageKeySpecifier | (() => undefined | WebhookMessageKeySpecifier),
		fields?: WebhookMessageFieldPolicy,
	},
	WebhookMessageConnection?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WebhookMessageConnectionKeySpecifier | (() => undefined | WebhookMessageConnectionKeySpecifier),
		fields?: WebhookMessageConnectionFieldPolicy,
	},
	WebhookMessageEdge?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WebhookMessageEdgeKeySpecifier | (() => undefined | WebhookMessageEdgeKeySpecifier),
		fields?: WebhookMessageEdgeFieldPolicy,
	},
	WebhookMessageRequest?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WebhookMessageRequestKeySpecifier | (() => undefined | WebhookMessageRequestKeySpecifier),
		fields?: WebhookMessageRequestFieldPolicy,
	},
	WebhookMessageRequestError?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WebhookMessageRequestErrorKeySpecifier | (() => undefined | WebhookMessageRequestErrorKeySpecifier),
		fields?: WebhookMessageRequestErrorFieldPolicy,
	},
	WebhookMessageResponse?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WebhookMessageResponseKeySpecifier | (() => undefined | WebhookMessageResponseKeySpecifier),
		fields?: WebhookMessageResponseFieldPolicy,
	},
	Widget?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WidgetKeySpecifier | (() => undefined | WidgetKeySpecifier),
		fields?: WidgetFieldPolicy,
	},
	WidgetPinSettings?: Omit<TypePolicy, "fields" | "keyFields"> & {
		keyFields?: false | WidgetPinSettingsKeySpecifier | (() => undefined | WidgetPinSettingsKeySpecifier),
		fields?: WidgetPinSettingsFieldPolicy,
	}
};
export type TypedTypePolicies = StrictTypedTypePolicies & TypePolicies;
export type PublishBlogMutationVariables = Exact<{
  title: Scalars['String']['input'];
  contentMarkdown: Scalars['String']['input'];
  tags: Array<PublishPostTagInput> | PublishPostTagInput;
  publicationId: Scalars['ObjectId']['input'];
}>;


export type PublishBlogMutation = { __typename?: 'Mutation', publishPost: { __typename?: 'PublishPostPayload', post?: { __typename?: 'Post', id: string, slug: string, url: string, title: string, subtitle?: string } } };

export type GetPersonalFeedQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPersonalFeedQuery = { __typename?: 'Query', me: { __typename?: 'MyUser', follows: { __typename?: 'UserConnection', nodes: Array<{ __typename?: 'User', id: string, publications: { __typename?: 'UserPublicationsConnection', edges: Array<{ __typename?: 'UserPublicationsEdge', node: { __typename?: 'Publication', id: string, title: string, canonicalURL: string, favicon?: string, followersCount?: number, headerColor?: string, displayTitle?: string, posts: { __typename?: 'PublicationPostConnection', edges: Array<{ __typename?: 'PostEdge', node: { __typename?: 'Post', title: string, slug: string, subtitle?: string, canonicalUrl?: string } }> } } }> } }> } } };

export type GetMyPublicationQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyPublicationQuery = { __typename?: 'Query', me: { __typename?: 'MyUser', publications: { __typename?: 'UserPublicationsConnection', edges: Array<{ __typename?: 'UserPublicationsEdge', node: { __typename?: 'Publication', id: string, displayTitle?: string, favicon?: string } }> } } };

export type GetAllPostsOfaPublicationQueryVariables = Exact<{
  publicationId: Scalars['ObjectId']['input'];
}>;


export type GetAllPostsOfaPublicationQuery = { __typename?: 'Query', publication?: { __typename?: 'Publication', title: string, posts: { __typename?: 'PublicationPostConnection', edges: Array<{ __typename?: 'PostEdge', node: { __typename?: 'Post', title: string, slug: string, subtitle?: string, url: string, brief: string, ogMetaData?: { __typename?: 'OpenGraphMetaData', image?: string }, tags?: Array<{ __typename?: 'Tag', name: string }> } }> } } };

export type GetProfileDataQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProfileDataQuery = { __typename?: 'Query', me: { __typename?: 'MyUser', id: string, username: string, profilePicture?: string, followersCount: number, tagsFollowing: Array<{ __typename?: 'Tag', id: string, tagline?: string, logo?: string, info?: { __typename?: 'Content', text: string } }>, publications: { __typename?: 'UserPublicationsConnection', edges: Array<{ __typename?: 'UserPublicationsEdge', node: { __typename?: 'Publication', id: string, url: string, about?: { __typename?: 'Content', text: string }, drafts: { __typename?: 'DraftConnection', edges: Array<{ __typename?: 'DraftEdge', node: { __typename?: 'Draft', title?: string } }> } } }> }, bio?: { __typename?: 'Content', text: string }, posts: { __typename?: 'UserPostConnection', nodes: Array<{ __typename?: 'Post', id: string, title: string, subtitle?: string, slug: string, publishedAt: any, url: string, coverImage?: { __typename?: 'PostCoverImage', url: string }, series?: { __typename?: 'Series', name: string } }> } } };

export type GetFollowedTagsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetFollowedTagsQuery = { __typename?: 'Query', me: { __typename?: 'MyUser', tagsFollowing: Array<{ __typename?: 'Tag', id: string, slug: string }> } };

export type SearchTagBasedBlogsQueryVariables = Exact<{
  tag: Scalars['String']['input'];
  sortBy?: InputMaybe<TagPostsSort>;
}>;


export type SearchTagBasedBlogsQuery = { __typename?: 'Query', tag?: { __typename?: 'Tag', id: string, name: string, slug: string, postsCount: number, posts: { __typename?: 'FeedPostConnection', edges: Array<{ __typename?: 'PostEdge', node: { __typename?: 'Post', id: string, title: string, subtitle?: string } }> } } };


export const PublishBlogDocument = gql`
    mutation publishBlog($title: String!, $contentMarkdown: String!, $tags: [PublishPostTagInput!]!, $publicationId: ObjectId!) {
  publishPost(
    input: {title: $title, contentMarkdown: $contentMarkdown, tags: $tags, publicationId: $publicationId}
  ) {
    post {
      id
      slug
      url
      title
      subtitle
    }
  }
}
    `;
export type PublishBlogMutationFn = Apollo.MutationFunction<PublishBlogMutation, PublishBlogMutationVariables>;

/**
 * __usePublishBlogMutation__
 *
 * To run a mutation, you first call `usePublishBlogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishBlogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishBlogMutation, { data, loading, error }] = usePublishBlogMutation({
 *   variables: {
 *      title: // value for 'title'
 *      contentMarkdown: // value for 'contentMarkdown'
 *      tags: // value for 'tags'
 *      publicationId: // value for 'publicationId'
 *   },
 * });
 */
export function usePublishBlogMutation(baseOptions?: Apollo.MutationHookOptions<PublishBlogMutation, PublishBlogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PublishBlogMutation, PublishBlogMutationVariables>(PublishBlogDocument, options);
      }
export type PublishBlogMutationHookResult = ReturnType<typeof usePublishBlogMutation>;
export type PublishBlogMutationResult = Apollo.MutationResult<PublishBlogMutation>;
export type PublishBlogMutationOptions = Apollo.BaseMutationOptions<PublishBlogMutation, PublishBlogMutationVariables>;
export const GetPersonalFeedDocument = gql`
    query GetPersonalFeed {
  me {
    follows(page: 1, pageSize: 10) {
      nodes {
        id
        publications(first: 10) {
          edges {
            node {
              id
              title
              canonicalURL
              favicon
              followersCount
              headerColor
              displayTitle
              posts(first: 20) {
                edges {
                  node {
                    title
                    slug
                    subtitle
                    canonicalUrl
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
    `;

/**
 * __useGetPersonalFeedQuery__
 *
 * To run a query within a React component, call `useGetPersonalFeedQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPersonalFeedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPersonalFeedQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPersonalFeedQuery(baseOptions?: Apollo.QueryHookOptions<GetPersonalFeedQuery, GetPersonalFeedQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPersonalFeedQuery, GetPersonalFeedQueryVariables>(GetPersonalFeedDocument, options);
      }
export function useGetPersonalFeedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPersonalFeedQuery, GetPersonalFeedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPersonalFeedQuery, GetPersonalFeedQueryVariables>(GetPersonalFeedDocument, options);
        }
export type GetPersonalFeedQueryHookResult = ReturnType<typeof useGetPersonalFeedQuery>;
export type GetPersonalFeedLazyQueryHookResult = ReturnType<typeof useGetPersonalFeedLazyQuery>;
export type GetPersonalFeedQueryResult = Apollo.QueryResult<GetPersonalFeedQuery, GetPersonalFeedQueryVariables>;
export const GetMyPublicationDocument = gql`
    query GetMyPublication {
  me {
    publications(first: 10) {
      edges {
        node {
          id
          displayTitle
          favicon
        }
      }
    }
  }
}
    `;

/**
 * __useGetMyPublicationQuery__
 *
 * To run a query within a React component, call `useGetMyPublicationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPublicationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPublicationQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyPublicationQuery(baseOptions?: Apollo.QueryHookOptions<GetMyPublicationQuery, GetMyPublicationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyPublicationQuery, GetMyPublicationQueryVariables>(GetMyPublicationDocument, options);
      }
export function useGetMyPublicationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyPublicationQuery, GetMyPublicationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyPublicationQuery, GetMyPublicationQueryVariables>(GetMyPublicationDocument, options);
        }
export type GetMyPublicationQueryHookResult = ReturnType<typeof useGetMyPublicationQuery>;
export type GetMyPublicationLazyQueryHookResult = ReturnType<typeof useGetMyPublicationLazyQuery>;
export type GetMyPublicationQueryResult = Apollo.QueryResult<GetMyPublicationQuery, GetMyPublicationQueryVariables>;
export const GetAllPostsOfaPublicationDocument = gql`
    query GetAllPostsOfaPublication($publicationId: ObjectId!) {
  publication(id: $publicationId) {
    title
    posts(first: 10) {
      edges {
        node {
          title
          slug
          subtitle
          url
          ogMetaData {
            image
          }
          brief
          tags {
            name
          }
        }
      }
    }
  }
}
    `;

/**
 * __useGetAllPostsOfaPublicationQuery__
 *
 * To run a query within a React component, call `useGetAllPostsOfaPublicationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllPostsOfaPublicationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllPostsOfaPublicationQuery({
 *   variables: {
 *      publicationId: // value for 'publicationId'
 *   },
 * });
 */
export function useGetAllPostsOfaPublicationQuery(baseOptions: Apollo.QueryHookOptions<GetAllPostsOfaPublicationQuery, GetAllPostsOfaPublicationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllPostsOfaPublicationQuery, GetAllPostsOfaPublicationQueryVariables>(GetAllPostsOfaPublicationDocument, options);
      }
export function useGetAllPostsOfaPublicationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllPostsOfaPublicationQuery, GetAllPostsOfaPublicationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllPostsOfaPublicationQuery, GetAllPostsOfaPublicationQueryVariables>(GetAllPostsOfaPublicationDocument, options);
        }
export type GetAllPostsOfaPublicationQueryHookResult = ReturnType<typeof useGetAllPostsOfaPublicationQuery>;
export type GetAllPostsOfaPublicationLazyQueryHookResult = ReturnType<typeof useGetAllPostsOfaPublicationLazyQuery>;
export type GetAllPostsOfaPublicationQueryResult = Apollo.QueryResult<GetAllPostsOfaPublicationQuery, GetAllPostsOfaPublicationQueryVariables>;
export const GetProfileDataDocument = gql`
    query GetProfileData {
  me {
    id
    username
    profilePicture
    tagsFollowing {
      id
      tagline
      info {
        text
      }
      logo
    }
    publications(first: 10) {
      edges {
        node {
          id
          about {
            text
          }
          url
          drafts(first: 10) {
            edges {
              node {
                title
              }
            }
          }
        }
      }
    }
    bio {
      text
    }
    followersCount
    posts(page: 1, pageSize: 10) {
      nodes {
        id
        coverImage {
          url
        }
        title
        subtitle
        slug
        series {
          name
        }
        publishedAt
        url
      }
    }
  }
}
    `;

/**
 * __useGetProfileDataQuery__
 *
 * To run a query within a React component, call `useGetProfileDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetProfileDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetProfileDataQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetProfileDataQuery(baseOptions?: Apollo.QueryHookOptions<GetProfileDataQuery, GetProfileDataQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetProfileDataQuery, GetProfileDataQueryVariables>(GetProfileDataDocument, options);
      }
export function useGetProfileDataLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetProfileDataQuery, GetProfileDataQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetProfileDataQuery, GetProfileDataQueryVariables>(GetProfileDataDocument, options);
        }
export type GetProfileDataQueryHookResult = ReturnType<typeof useGetProfileDataQuery>;
export type GetProfileDataLazyQueryHookResult = ReturnType<typeof useGetProfileDataLazyQuery>;
export type GetProfileDataQueryResult = Apollo.QueryResult<GetProfileDataQuery, GetProfileDataQueryVariables>;
export const GetFollowedTagsDocument = gql`
    query GetFollowedTags {
  me {
    tagsFollowing {
      id
      slug
    }
  }
}
    `;

/**
 * __useGetFollowedTagsQuery__
 *
 * To run a query within a React component, call `useGetFollowedTagsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFollowedTagsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFollowedTagsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetFollowedTagsQuery(baseOptions?: Apollo.QueryHookOptions<GetFollowedTagsQuery, GetFollowedTagsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFollowedTagsQuery, GetFollowedTagsQueryVariables>(GetFollowedTagsDocument, options);
      }
export function useGetFollowedTagsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFollowedTagsQuery, GetFollowedTagsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFollowedTagsQuery, GetFollowedTagsQueryVariables>(GetFollowedTagsDocument, options);
        }
export type GetFollowedTagsQueryHookResult = ReturnType<typeof useGetFollowedTagsQuery>;
export type GetFollowedTagsLazyQueryHookResult = ReturnType<typeof useGetFollowedTagsLazyQuery>;
export type GetFollowedTagsQueryResult = Apollo.QueryResult<GetFollowedTagsQuery, GetFollowedTagsQueryVariables>;
export const SearchTagBasedBlogsDocument = gql`
    query SearchTagBasedBlogs($tag: String!, $sortBy: TagPostsSort) {
  tag(slug: $tag) {
    id
    name
    slug
    postsCount
    posts(first: 50, filter: {sortBy: $sortBy}) {
      edges {
        node {
          id
          title
          subtitle
        }
      }
    }
  }
}
    `;

/**
 * __useSearchTagBasedBlogsQuery__
 *
 * To run a query within a React component, call `useSearchTagBasedBlogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchTagBasedBlogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchTagBasedBlogsQuery({
 *   variables: {
 *      tag: // value for 'tag'
 *      sortBy: // value for 'sortBy'
 *   },
 * });
 */
export function useSearchTagBasedBlogsQuery(baseOptions: Apollo.QueryHookOptions<SearchTagBasedBlogsQuery, SearchTagBasedBlogsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchTagBasedBlogsQuery, SearchTagBasedBlogsQueryVariables>(SearchTagBasedBlogsDocument, options);
      }
export function useSearchTagBasedBlogsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchTagBasedBlogsQuery, SearchTagBasedBlogsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchTagBasedBlogsQuery, SearchTagBasedBlogsQueryVariables>(SearchTagBasedBlogsDocument, options);
        }
export type SearchTagBasedBlogsQueryHookResult = ReturnType<typeof useSearchTagBasedBlogsQuery>;
export type SearchTagBasedBlogsLazyQueryHookResult = ReturnType<typeof useSearchTagBasedBlogsLazyQuery>;
export type SearchTagBasedBlogsQueryResult = Apollo.QueryResult<SearchTagBasedBlogsQuery, SearchTagBasedBlogsQueryVariables>;