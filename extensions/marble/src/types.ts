export interface Pagination {
  limit: number;
  currentPage: number;
  nextPage: number | null;
  previousPage: number | null;
  totalPages: number;
  totalItems: number;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  featured: boolean;
  coverImage: string | null;
  description: string;
  publishedAt: string;
  updatedAt: string;
  status: string;
  content: string;
  attribution: { author: string; url: string } | null;
  authors: Author[];
  category: Category;
  tags: Tag[];
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  bio: string | null;
  role: string | null;
  socials: { platform: string; url: string }[];
  count?: { posts: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  count?: { posts: number };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  count?: { posts: number };
}

export interface PostsResponse {
  posts: Post[];
  pagination: Pagination;
}

export interface AuthorsResponse {
  authors: Author[];
  pagination: Pagination;
}

export interface CategoriesResponse {
  categories: Category[];
  pagination: Pagination;
}

export interface TagsResponse {
  tags: Tag[];
  pagination: Pagination;
}
