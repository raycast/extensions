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

export interface LinkdingAccount {
  serverUrl: string;
  apiKey: string;
  ignoreSSL: boolean;
}

export interface LinkdingAccountForm extends LinkdingAccount {
  name?: string;
}

export type LinkdingAccountMap = { [name: string]: LinkdingAccount };

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
  tag_names: string[];
}
