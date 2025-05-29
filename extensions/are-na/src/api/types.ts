/**
 * Types for the Are.na API responses
 */

/**
 * Parameter type for API functions
 */
export interface Params {
  [key: string]: unknown;
}

export interface PaginationParams extends Params {
  page: number;
  per: number;
}

export interface GroupResponse {
  get(params?: PaginationParams): Promise<Group>;
  channels(params?: PaginationParams): Promise<Channel[]>;
}

export interface ChannelResponse {
  get(params?: PaginationParams): Promise<Channel>;
  thumb(params?: Params): Promise<Channel>;
  connections(params?: PaginationParams): Promise<Channel[]>;
  channels(params?: PaginationParams): Promise<Channel[]>;
  contents(params?: PaginationParams): Promise<Block[]>;
  collaborators(params?: PaginationParams): Promise<User[]>;
  create(titleOrStatus: string, status?: ChannelStatus): Promise<Channel>;
  delete(deleteSlug?: string): Promise<void>;
  update(params?: Params): Promise<Channel>;
  addCollaborators(...userIDs: string[]): Promise<User | User[]>;
  deleteCollaborators(...userIDs: string[]): Promise<User | User[]>;
  createBlock(opts: { content: string; source?: string }): Promise<Block>;
  deleteBlock(blockID: string): Promise<void>;
}

export interface ArenaOptions {
  accessToken?: string;
  authToken?: string;
  baseURL?: string;
  requestHandler?: (method: string, url: string, data?: Params, options?: Params) => Promise<unknown>;
}

/**
 * The type of block.
 */
export type BlockType = "Image" | "Text" | "Link" | "Media" | "Attachment" | "Channel";

/**
 * Either "default" (a standard channel) or "profile" the default channel of a user
 */
export type ChannelKind = "default" | "profile";

/**
 * Can be "private" (only open for reading and adding to the channel by channel author and collaborators),
 * "closed" (open for reading by everyone, only channel author and collaborators can add) or "public"
 * (everyone can read and add to the channel)
 */
export type ChannelStatus = "private" | "closed" | "public";

/**
 * Timestamp type
 */
export type Timestamp = string;

/**
 * Representation of a block's source
 */
export interface Source {
  provider?: { name?: string; url?: string };
  title?: string;
  url?: string;
}

/**
 * Representation of a channel the block appears in
 */
export interface Connection extends Partial<Channel> {
  id?: number;
  title?: string;
  added_to_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Image {
  /**
   * Name of the file as it appears on the Arena filesystem
   */
  filename: string;
  /**
   * MIME type of the image (e.g. 'image/png')
   */
  content_type: string;
  /**
   * Timestamp of the last time the file was updated
   */
  updated_at: Timestamp;
  /**
   * Only contains url which is a URL of the thumbnail sized image (200x200)
   */
  thumb: { url: string };
  /**
   * Only contains url which is a URL of the display sized image
   * (same aspect ratio as original image but with a maximum width
   * of 600px or a maximum height of 600px, whichever comes first)
   */
  display: { url: string };
  /**
   * Contains url which is a URL of the original image as well file_size
   * (an integer representation in bytes) and file_size_display
   * (a nicer string representation of the file_size)
   */
  original: { url: string; file_size: number; file_size_display: string };
}

/**
 * Groups allow multiple people to collaborate, access, and upload shared blocks and channels.
 * Groups have their own group profile pages and are public by default.
 */
export interface Group {
  /**
   * The internal ID of the group
   */
  id: number;
  /**
   * The title of the group
   */
  title: string | null;
  /**
   * The description of the group
   */
  description: string | null;
  /**
   * Timestamp when the group was created
   */
  created_at: Timestamp;
  /**
   * Timestamp when the group was last updated
   */
  updated_at: Timestamp;
  /**
   * Will always be "Group"
   */
  class: string;
  /**
   * More information on the group admin
   */
  user: User;
  /**
   * More information on the group members
   */
  users: User[];
  /**
   * UserIds of the group members
   */
  member_ids: number[];
  accessible_by_ids: number[];
}

/**
 * Blocks are modular and reusable pieces of data or content. A block has primary user
 * (indicated by user_id) and can only be edited by the user who created it.
 * However, any block can be reused in multiple channels (this is called a connection).
 * The channels a block appears in across Arena are listed in the blocks' connections attribute.
 */
export interface Block {
  /**
   * The internal ID of the block
   */
  id: number;
  /**
   * The title of the block
   */
  title: string | null;
  /**
   * Timestamp when the block was last updated
   */
  updated_at: Timestamp;
  /**
   * Timestamp when the block was created
   */
  created_at: Timestamp;
  /**
   * Represents the state of the blocks processing lifecycle.
   * (this will most often be "Available" but can also be "Failure", "Processed", "Processing")
   */
  state: string;
  /**
   * The number of comments on a block
   */
  comment_count: number;
  /**
   * If the title is present on the block, this will be identical to the title.
   * Otherwise it will be a truncated string of the *description* or *content*.
   * If neither of those are present, it will be "Untitled"
   */
  generated_title: string;
  /**
   * The type of block. Can be "Image", "Text", "Link", "Media", or "Attachment"
   */
  class: BlockType;
  /**
   * This will always be "Block"
   */
  base_class: string;
  /**
   * If the block is of class "Text", this will be the text content as markdown
   */
  content: string | null;
  /**
   * If the block is of class "Text", this will be the text content as HTML
   */
  content_html: string | null;
  /**
   * This is used for captioning any type of block. Returns markdown.
   */
  description: string | null;
  /**
   * This is used for captioning any type of block. Returns HTML
   */
  description_html: string | null;
  /**
   * If the Block is saved from somewhere on the web,
   * this returns a User representation of the source
   */
  source: Source | null;
  /**
   * If the Block is of class "Image" or "Link",
   * this will contain the various sizes of images that Arena provides
   * (in the case of a "Link" it will be a screenshot of the website).
   */
  image: Image | null;
  /**
   * More information on the channel author
   */
  user: User;

  connections?: Connection[];

  visibility: "public" | "private";

  slug: string;

  attachment?: Attachment;
}

/**
 * Attachment type
 */
export interface Attachment {
  file_name: string;
  file_size: number;
  file_size_display: string;
  content_type: string;
  extension: string;
  url: string;
}

/**
 * Block of type "Text"
 */
export interface TextBlock extends Block {
  class: "Text";
  content: string;
  content_html: string;
  image: null;
}

/**
 * Block of type "Image"
 */
export interface ImageBlock extends Block {
  class: "Image";
  content: null;
  content_html: null;
  image: Image;
}

/**
 * Block of type "Link"
 */
export interface LinkBlock extends Block {
  class: "Link";
  content: null;
  content_html: null;
  image: Image;
}

/**
 * Block of type "Media"
 */
export interface MediaBlock extends Block {
  class: "Media";
  content: null;
  content_html: null;
  image: null;
}

/**
 * Block of type "Attachment"
 */
export interface AttachmentBlock extends Block {
  class: "Attachment";
  content: null;
  content_html: null;
  image: null;
}

export interface Metadata {
  description: string;
}

/**
 * Channels are organizational structures for content. This means blocks but also sometimes other channels.
 * Channels have a primary user (indicated by the user_id) but can also have collaborators (an array of users).
 * Channels can be public (anyone can view and add),
 * closed (only the channel's author and collaborators can add but everyone can view)
 * and private (only the channels authors and collaborators can view and add).
 */
export interface Channel {
  /**
   * The internal ID of the channel
   */
  id: number;
  /**
   * The title of the channel
   */
  title: string;
  /**
   * Date when the channel was created
   */
  created_at: Timestamp;
  /**
   * Date when the channel was last updated
   */
  updated_at: Timestamp;
  /**
   * If channel is visible to all members of arena or not
   */
  published: boolean;
  /**
   * If channel is open to other members of arena for adding blocks
   */
  open: boolean;
  /**
   * If the channel has collaborators or not
   */
  collaboration: boolean;
  /**
   * The slug of the channel used in the url (e.g. http:are.na/arena-influences)
   */
  slug: string;

  owner_slug: string;
  /**
   * The number of items in a channel (blocks and other channels)
   */
  length: number;
  /**
   * Can be either "default" (a standard channel) or "profile" the default channel of a user
   */
  kind: ChannelKind;
  /**
   * Can be "private" (only open for reading and adding to the channel by channel author and collaborators),
   * "closed" (open for reading by everyone, only channel author and collaborators can add)
   * or "public" (everyone can read and add to the channel)
   */
  status: ChannelStatus;
  /**
   * Internal ID of the channel author
   */
  user_id: number;
  /**
   * Will always be "Channel"
   */
  class: string;
  /**
   * Will always be "Channel"
   */
  base_class: string;
  /**
   * More information on the channel author.
   */
  user: User;
  /**
   * If pagination is used, how many total pages there are in your request
   */
  total_pages: number;
  /**
   * If pagination is used, page requested
   */
  metadata: Metadata;

  current_page: number;
  /**
   * If pagination is used, items per page requested
   */
  per: number;
  /**
   * Number of followers the channel has
   */
  follower_count: number;
  /**
   * Array of blocks and other channels in the channel.
   * Note: If the request is authenticated, this will include any private channels included in the requested
   * channel that you have access to. If not, only public channels included in the requested channel will be shown.
   */
  contents: Block[] | null;
  /**
   * Collaborators on the channel
   */
  collaborators: User[] | null;
}

export interface MinimalChannel {
  slug: string;
  title: string;
  user: string | { full_name: string };
  open?: boolean;
}

/**
 * Users are representations of any account on Arena.
 * Users can have channels, followers, blocks and they can also follow both channels and users.
 */
export interface User {
  /**
   * The internal ID of the user
   */
  id: number;
  /**
   * The slug of the user. This is used for the user's default profile channel
   */
  slug: string;
  /**
   * The first name of the user
   */
  first_name: string;
  /**
   * The last name of the user
   */
  last_name: string;
  /**
   * The full name of the user
   */
  full_name: string;
  /**
   * The gravatar URL to the user's avatar
   */
  avatar: string;
  /**
   * The number of channels the user owns or is a collaborator on
   */
  channel_count: number;
  /**
   * The number of channels and users a user is following
   */
  following_count: number;
  /**
   * The internal ID of the user's profile channel
   */
  profile_id: number;
  /**
   * The number of users following the user
   */
  follower_count: number;
  /**
   * Currently this will be equivalent to "full_name"
   */
  username?: string;
  /**
   * Will always be "User"
   */
  class?: string;
  /**
   * The initials of a user. Derived from the user's first and last name
   */
  initials?: string;
}

/**
 * Basic pagination parameters
 */
export interface PaginatedResponse {
  term: string;
  total_pages: number;
  current_page: number;
  per: number;
}

/**
 * Search response for user search results
 */
export interface SearchUsersResponse extends PaginatedResponse {
  users: User[];
}

/**
 * Search response for channel search results
 */
export interface SearchChannelsResponse extends PaginatedResponse {
  channels: Channel[];
}

/**
 * Search response for block search results
 */
export interface SearchBlocksResponse extends PaginatedResponse {
  blocks: Block[];
}

/**
 * Combined search response for all search results
 */
export interface SearchResponse extends PaginatedResponse {
  users?: User[];
  channels?: Channel[];
  blocks?: Block[];
}
