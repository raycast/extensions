export enum ArticleState {
  Draft = "draft",
  Published = "live",
}
export type Article = {
  organizationId: string;
  articleId: string;
  title: string;
  state: ArticleState;
};
export type CreateArticleRequest = {
  title: string;
  description: string;
};

export type Board = {
  category: string;
  icon: {
    type: string;
    value: string;
  };
  private: boolean;
  name: {
    [locale: string]: string;
  };
  id: string;
};

export enum ChangelogState {
  Draft = "draft",
  Published = "live",
}
export type Changelog = {
  date: string;
  organization: string;
  type: "changelog";
  id: string;
  featuredImage?: string;
  title: string;
  state: ChangelogState;
};
export type CreateChangelogRequest = {
  title: string;
  markdownContent: string;
};

export type Comment = {
  content: string;
  upvotes: number;

  id: string;
  authorId: string;
  author: string;
  authorPicture: string;
};
export type CreateCommentRequest = {
  submissionId: string;
  content: string;
};

export type Post = {
  slug: string;
  title: string;
  content: string;

  postStatus: {
    name: string;
    color: string;
    type: string;
    isDefault: boolean;
    id: string;
  };
  date: string;
  commentCount: number;
  id: string;
  postCategory: Board;
  authorEmail: string;
};
export type CreatePostRequest = {
  title: string;
  content: string;
  category: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  profilePicture: string;
};

export type PaginatedResult<T> = {
  results: T[];
  page: number;
  limit: number;
  totalPages?: number;
  totalResults: number;
};
export type ErrorResult =
  | {
      code: number;
      message: string;
    }
  | {
      success: false;
      error: string;
    };
