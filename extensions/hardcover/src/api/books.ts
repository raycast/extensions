import { UNKNOWN_ERROR_MESSAGE } from "../helpers/errors";
import { HardcoverClient } from "./hardcoverClient";
import { List } from "./lists";

export const WANT_TO_READ_STATUS = 1;
export const CURRENTLY_READING_STATUS = 2;
export const READ_STATUS = 3;
export const PAUSED_STATUS = 4;
export const DID_NOT_FINISH_STATUS = 5;
export const IGNORED_STATUS = 6;

export const UserBookStatusMapping = {
  [WANT_TO_READ_STATUS]: "Want to Read",
  [CURRENTLY_READING_STATUS]: "Currently Reading",
  [READ_STATUS]: "Read",
  // [PAUSED_STATUS]: "Paused", // Not supported in Hardcover UI for now
  [DID_NOT_FINISH_STATUS]: "Did Not Finish",
  // [IGNORED_STATUS]: "Ignored", // Not supported in Hardcover UI for now
};

export type UserBookStatusEnum = {
  id: number;
  slug: string;
  status: string;
};

export type FeaturedSeries = {
  details?: string;
  featured?: boolean;
  id: number;
  position?: number;
  series?: {
    id?: number;
    name?: string;
    primary_books_count?: number;
    slug?: string;
  };
};

export type Author = {
  id: number;
  image?: {
    id?: number;
    url?: string;
  };
  name?: string;
  slug?: string;
};

export type Contribution = {
  author?: Author;
};

export type SearchBook = {
  id: number;
  title: string;
  description?: string;
  slug?: string;
  image?: {
    url?: string;
  };
  contributions?: Contribution[];
  release_date?: string;
  rating?: number;
  ratings_count?: number;
  reviews_count?: number;
  genres?: string[];
  content_warnings?: string[];
  featured_series?: FeaturedSeries;
};

export type BookDetail = Pick<
  SearchBook,
  | "id"
  | "title"
  | "slug"
  | "image"
  | "release_date"
  | "rating"
  | "ratings_count"
  | "reviews_count"
  | "content_warnings"
  | "contributions"
> & {
  featured_book_series?: FeaturedSeries;
  taggings?: {
    id?: number;
    tag?: {
      id?: number;
      tag?: string;
    };
  }[];
};

export type UserBookResponse = {
  id: number;
  rating: number;
  list_book?: {
    book_id?: number;
    list_id?: number;
  };
};

export type SearchBookResponse = {
  data: {
    search: {
      page: number;
      per_page: number;
      results: {
        found: number;
        hits: {
          document: SearchBook;
        }[];
      };
    };
  };
};

export type UserBookRead = {
  id: number;
  paused_at?: string;
  progress?: number;
  progress_pages?: number;
  progress_seconds?: number;
  started_at?: string;
  finished_at?: string;
};

export type UserBook = {
  id: number;
  rating: number;
  user_book_status: UserBookStatusEnum;
  user_book_reads: UserBookRead[];
  book?: BookDetail;
};

export type ListBook = {
  id: number;
  list?: List;
  book?: BookDetail;
};

export type Book = {
  user_books: UserBook[];
  list_books: ListBook[];
};

export type GetUserBookResponse = {
  data: {
    books: Book[];
  };
};

export type UpdateBookStatusResponse = {
  data: {
    insert_user_book: {
      id: number;
      error: string;
    };
  };
};

export type GetListBooksResponse = {
  data: {
    me: {
      lists: {
        id: number;
        slug: string;
        name: string;
        description: string;
        books_count: number;
        list_books: ListBook[];
      }[];
    }[];
  };
};

export type GetUserBooksResponse = {
  data: {
    me: {
      user_books: UserBook[];
    }[];
  };
};

export type TransformedListBook = Omit<ListBook, "book"> & {
  book: SearchBook;
};

export type TransformedList = {
  id: number;
  slug: string;
  name: string;
  description: string;
  books_count: number;
  list_books: TransformedListBook[];
};

export type TransformedUserBook = Omit<UserBook, "book"> & {
  book: SearchBook;
};

export async function searchBooks(query: string, page: number) {
  const client = new HardcoverClient();

  const apiPage = page + 1; // API is 1-indexed while Raycast is 0-indexed

  const graphql_query = `
    query MyQuery($query: String = "") {
      search(query: $query, query_type: "book", page: ${apiPage}, per_page: 25) {
        page
        per_page
        results
      }
    }
  `;

  const variables = {
    query: query,
  };

  const { data } = await client.post<SearchBookResponse>(graphql_query, variables);

  if (!data) {
    return { data: [], hasMore: false };
  }

  const hasMore = data.search.page * data.search.per_page < data.search.results.found;

  return { data: data.search.results.hits.map((hit) => hit.document), hasMore };
}

export async function getUserBook(bookId: number, userId: number) {
  const client = new HardcoverClient();

  const graphql_query = `
    query GetUserBooks($book_id: Int, $user_id: Int) {
      books(where: {id: {_eq: $book_id}}) {
        user_books(where: {user_id: {_eq: $user_id}}) {
          id
          rating
          user_book_status {
            id
            slug
            status
          }
          user_book_reads {
            id
            paused_at
            progress
            progress_pages
            progress_seconds
            started_at
            finished_at
          }
        }
        list_books(where: {list: {user_id: {_eq: $user_id}}}) {
          id
          list {
            id
            slug
            name
            description
          }
        }
      }
    }
  `;

  const variables = {
    book_id: Number(bookId),
    user_id: Number(userId),
  };

  const { data } = await client.post<GetUserBookResponse>(graphql_query, variables);

  return data.books?.[0] ?? null;
}

export async function addBookToList(listId: number, bookId: number) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation InsertListBook($list_id: Int!, $book_id: Int!) {
      insert_list_book(object: {list_id: $list_id, book_id: $book_id}) {
        id
        list_book {
          book_id
          list_id
        }
      }
    }
  `;

  const variables = {
    book_id: Number(bookId),
    list_id: Number(listId),
  };

  const { id } = await client.post<UserBookResponse>(graphql_mutation, variables);

  return id;
}

export async function removeBookFromList(listBookId: number) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation DeleteListBook($id: Int!) {
      delete_list_book(id: $id) {
        id
        list_id
      }
    }
  `;

  const variables = {
    id: Number(listBookId),
  };

  const { id } = await client.post<{ id: number }>(graphql_mutation, variables);

  return id;
}

export async function updateBookStatus(bookId: number, statusId: number) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation InsertUserBookStatus($book_id: Int!, $status_id: Int) {
      insert_user_book(object: {book_id: $book_id, status_id: $status_id}) {
        id
        error
      }
    }
  `;

  const variables = {
    book_id: Number(bookId),
    status_id: Number(statusId),
  };

  const { data } = await client.post<UpdateBookStatusResponse>(graphql_mutation, variables);

  if (data.insert_user_book.error) {
    throw new Error(UNKNOWN_ERROR_MESSAGE);
  }

  return data.insert_user_book.id;
}

export async function updateBookRating(bookId: number, rating: number | string) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation InsertUserBookRating($book_id: Int!, $rating: numeric) {
      insert_user_book(object: {book_id: $book_id, rating: $rating}) {
        id
        error
      }
    }
  `;

  const variables = {
    book_id: Number(bookId),
    rating: String(rating),
  };

  const { data } = await client.post<UpdateBookStatusResponse>(graphql_mutation, variables);

  if (data.insert_user_book.error) {
    throw new Error(UNKNOWN_ERROR_MESSAGE);
  }

  return data.insert_user_book.id;
}

export async function removeBookStatus(userBookId: number) {
  const client = new HardcoverClient();

  const graphql_mutation = `
    mutation DeleteUserbook($id: Int!) {
      delete_user_book(id: $id) {
        id
      }
    }
  `;

  const variables = {
    id: Number(userBookId),
  };

  const { data } = await client.post<{ data: { delete_user_book: { id: number } } }>(graphql_mutation, variables);

  return data.delete_user_book.id;
}

export async function getListBooks() {
  const client = new HardcoverClient();

  const graphql_query = `
  {
    me {
      lists {
        books_count
        description
        id
        slug
        name
        list_books(order_by: {position: asc}) {
        id
          book_id
          book {
            id
            title
            description
            slug
            image {
              url
            }
            release_date
            rating
            ratings_count
            reviews_count
            contributions {
              author {
                id
                image {
                  id
                  url
                }
                slug
                name
              }
            }
            taggings(
              where: {tag: {tag_category: {category: {_eq: "Genre"}}}}
              distinct_on: tag_id
            ) {
              id
              tag {
                count
                tag
                id
                slug
                tag_category {
                  category
                }
              }
            }
            featured_book_series {
              id
              position
              details
              featured
              series {
                id
                name
                primary_books_count
                slug
              }
            }
          }
        }
      }
    }
  }
`;

  const { data } = await client.post<GetListBooksResponse>(graphql_query);

  return (data.me?.[0]?.lists ?? []).map((list) => ({
    ...list,
    list_books: list.list_books.map((listBook) => {
      if (!listBook.book) {
        return { ...listBook, book: {} as SearchBook };
      }
      const { featured_book_series, taggings, ...bookData } = listBook.book;
      return {
        ...listBook,
        book: {
          ...bookData,
          featured_series: featured_book_series as FeaturedSeries,
          genres: taggings?.map((t) => t.tag?.tag).filter(Boolean) || [],
        } as SearchBook,
      };
    }),
  })) as TransformedList[];
}

export async function getUserBooksByStatus(statusId: number) {
  const client = new HardcoverClient();

  const graphql_query = `
    query GetUserBooksByStatus($user_book_status_id: Int) {
      me {
        user_books(
          where: {user_book_status: {id: {_eq: $user_book_status_id}}}
          order_by: {date_added: desc}
          ) {
          id
          rating
          user_book_status {
            id
            slug
            status
          }
          user_book_reads {
            id
            paused_at
            progress
            progress_pages
            progress_seconds
            started_at
            finished_at
          }
          book {
            id
            title
            description
            slug
            image {
              url
            }
            release_date
            rating
            ratings_count
            reviews_count
            contributions {
              author {
                id
                image {
                  id
                  url
                }
                slug
                name
              }
            }
            taggings(
              where: {tag: {tag_category: {category: {_eq: "Genre"}}}}
              distinct_on: tag_id
            ) {
              id
              tag {
                count
                tag
                id
                slug
                tag_category {
                  category
                }
              }
            }
            featured_book_series {
              id
              position
              details
              featured
              series {
                id
                name
                primary_books_count
                slug
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    user_book_status_id: Number(statusId),
  };

  const { data } = await client.post<GetUserBooksResponse>(graphql_query, variables);

  return (data.me?.[0]?.user_books ?? []).map((user_book) => {
    if (!user_book.book) {
      return { ...user_book, book: {} as SearchBook };
    }

    const { featured_book_series, taggings, ...bookData } = user_book.book;

    return {
      ...user_book,
      book: {
        ...bookData,
        featured_series: featured_book_series as FeaturedSeries,
        genres: taggings?.map((t) => t.tag?.tag).filter(Boolean) || [],
      } as SearchBook,
    };
  }) as TransformedUserBook[];
}
