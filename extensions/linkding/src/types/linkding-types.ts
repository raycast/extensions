export interface LinkdingBookmark {
  id: number;
  url: string;
  title: string;
  description?: string;
  website_title?: string;
  website_description?: string;
  tag_names: string[];
}

export interface GetLinkdingBookmarkResponse {
  count: number;
  results: LinkdingBookmark[];
}

export interface WebsiteMetadata {
  title: string;
  description?: string;
}

export interface PostLinkdingBookmarkPayload {
  url: string;
  title: string;
  description: string;
  notes: string;
  is_archived: boolean;
  unread: boolean;
  shared: boolean;
  tag_names?: string[];
}

export interface CreateLinkdingBookmarkFormValues extends Omit<PostLinkdingBookmarkPayload, "tag_names"> {
  tags: string;
}
