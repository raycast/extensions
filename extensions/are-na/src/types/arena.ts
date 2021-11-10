/**
 Attributes
id 	(Integer) 	The internal ID of the channel
title 	(String) 	The title of the channel
created_at 	(Timestamp) 	Timestamp when the channel was created
updated_at 	(Timestamp) 	Timestamp when the channel was last updated
published 	(Boolean) 	If channel is visible to all members of arena or not
open 	(Boolean) 	If channel is open to other members of arena for adding blocks
collaboration 	(Boolean) 	If the channel has collaborators or not
slug 	(String) 	The slug of the channel used in the url (e.g. http://are.na/arena-influences)
kind 	(String) 	Can be either "default" (a standard channel) or "profile" the default channel of a user
status 	(String) 	Can be "private" (only open for reading and adding to the channel by channel author and collaborators), "closed" (open for reading by everyone, only channel author and collaborators can add) or "public" (everyone can read and add to the channel)
user_id 	(Integer) 	Internal ID of the channel author
user 	(Hash) 	More information on the channel author. Contains id, slug, first_name, last_name, full_name, avatar, email, channel_count, following_count, follower_count, and profile_id
follower_count 	(Integer) 	Number of followers the channel has
contents 	(Array, can be null) 	Array of blocks and other channels in the channel. Note: If the request is authenticated, this will include any private channels included in the requested channel that you have access to. If not, only public channels included in the requested channel will be shown.
collaborators 	(Array, can be null) 	Collaborators on the channel
length 	(Integer) 	The number of items in a channel (blocks and other channels)
 */
export interface Channel {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  open: boolean;
  collaboration: boolean;
  slug: string;
  kind: string;
  status: string;
  user_id: number;
  user: User;
  follower_count: number;
  contents: Channel[] | Block[];
  collaborators: User[];
  length: number;
}
/**
  Attributes
length 	(Integer) 	The number of items in a channel (blocks and other channels)
class 	(String) 	Will always be "Channel"
base_class 	(String) 	Will always be "Channel"
total_pages 	(Integer) 	If pagination is used, how many total pages there are in your request
current_page 	(Integer) 	If pagination is used, page requested
per 	(Integer) 	If pagination is used, items per page requested
channels   (Array) 	Array of channels
 */
export interface Channels {
  channels: Channel[];
  length: number;

  total_pages: number;
  current_page: number;
  per: number;
  channel_title: string;

  base_class: string;
  class: string;
}

/**
 Attributes
  id 	(Integer) 	The internal ID of the user
  slug 	(String) 	The slug of the user. This is used for the user's default profile channel
  username 	(String) 	Currently this will be equivalent to "full_name"
  first_name 	(String) 	The first name of the user
  last_name 	(String) 	The last name of the user
  avatar 	(String) 	The gravatar URL to the user's avatar
  channel_count 	(Integer) 	The number of channels the user owns or is a collaborator on
  following_count 	(Integer) 	The number of channels and users a user is following
  profile_id 	(Integer) 	The internal ID of the user's profile channel
  follower_count 	(String) 	The number of users following the user
  class 	(String) 	Will always be "User"
  initials 	(String) 	The initials of a user. Derived from the user's first and last name
 */
export interface User {
  id: number;
  slug: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  channel_count: number;
  following_count: number;
  profile_id: number;
  follower_count: number;
  class: string;
  initials: string;
}

export interface AvatarImage {
  thumb: string;
  display: string;
}

export interface Metadata {
  description?: any;
}

export interface Me {
  id: number;
  created_at: Date;
  slug: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string;
  avatar_image: AvatarImage;
  channel_count: number;
  following_count: number;
  profile_id: number;
  follower_count: number;
  initials: string;
  can_index: boolean;
  metadata: Metadata;
  is_premium: boolean;
  is_lifetime_premium: boolean;
  is_supporter: boolean;
  is_exceeding_connections_limit: boolean;
  is_confirmed: boolean;
  is_pending_reconfirmation: boolean;
  is_pending_confirmation: boolean;
  badge: string;
  base_class: string;
  class: string;
}
/**
 Attributes
id 	(Integer) 	The internal ID of the block
title 	(String, can be null) 	The title of the block
updated_at 	(Timestamp) 	Timestamp when the block was last updated
created_at 	(Timestamp) 	Timestamp when the block was created
state 	(String) 	Represents the state of the blocks processing lifecycle (this will most often "Available" but can also be "Failure", "Processed", "Processing")
comment_count 	(Integer) 	The number of comments on a block
generated_title 	(String) 	If the title is present on the block, this will be identical to the title. Otherwise it will be a truncated string of the *description* or *content*. If neither of those are present, it will be "Untitled"
class 	(String) 	The type of block. Can be "Image", "Text", "Link", "Media", or "Attachment"
base_class 	(String) 	This will always be "Block"
content 	(String, can be null) 	If the block is of class "Text", this will be the text content as markdown
content_html 	(String, can be null) 	If the block is of class "Text", this will be the text content as HTML
description 	(String, can be null) 	This is used for captioning any type of block. Returns markdown.
description_html 	(String, can be null) 	This is used for captioning any type of block. Returns HTML
source 	(Hash, can be null) 	If the Block is saved from somewhere on the web, this returns a Hash representation of the source
image 	(Hash, can be null) 	If the Block is of class "Image" or "Link", this will be a Hash representation of the various sizes of images that Arena provides (in the case of a "Link" it will be a screenshot of the website).
user 	(Hash) 	Representation of the author of the block
connections 	(Array) 	An array of hash representations of each of the channels the block appears in
*/
export interface Block {
  id: number;
  title: string;
  updated_at: string;
  created_at: string;
  state: string;
  comment_count: number;
  generated_title: string;
  class: string;
  base_class: string;
  content: string;
  content_html: string;
  description: string;
  description_html: string;
  source?: Source;
  image?: Image;
  user: User;
  connections: Connection[];
}
/**
  Attributes
url 	(String) 	The url of the source
provider 	(Hash) 	A hash of more info about the provider 
  name: (String) The name of the source provider 
  url: (String) The hostname of the source provider 
 */
export interface Source {
  url: string;
  provider: {
    name: string;
    url: string;
  };
}
/**
  Attributes
filename 	(String) 	Name of the file as it appears on the Arena filesystem
content_type 	(String) 	MIME type of the image (e.g. 'image/png')
updated_at 	(Timestamp) 	Timestamp of the last time the file was updated
thumb 	(Hash) 	Only contains url which is a URL of the thumbnail sized image (200x200)
display 	(Hash) 	Only contains 
  url which is a URL of the display sized image (same aspect ratio as original image but with a maximim width of 600px or a maximum height of 600px, whichever comes first)
original 	(Hash) 	Contains 
  url which is a URL of the original image as well 
  file_size (an integer representation in bytes) and 
  file_size_display (a nicer string representation of the file_size)
*/
export interface Image {
  filename: string;
  content_type: string;
  updated_at: string;
  thumb: {
    url: string;
  };
  display: {
    url: string;
  };
  original: {
    url: string;
    file_size: number;
    file_size_display: string;
  };
}

export type Connection = unknown;
