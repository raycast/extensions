export interface Book {
  id: string;
  title: string;
  author: string;
  contentUrl: {
    detailsPage: string;
  };
  thumbnail: string;
  rating?: string;
}

export interface Review {
  reviewerName: string;
  review: string;
  reviewDate: string;
}

export interface BookDetails extends Pick<Book, "id" | "author" | "title" | "rating"> {
  description: string;
  format: string;
  published: string;
  ratingStatistics: string;
  url: string;
  authorDetailsPageUrl: string;
  cover: {
    source?: string;
  };
  language?: string;
  genres?: string[];
  reviews?: Array<Review>;
}

export interface Person {
  id: string;
  name: string;
  avatar: string;
  booksCount?: string;
  friendsCount?: string;
  contentUrl: {
    detailsPage: string;
  };
}

export interface PersonDetails extends Pick<Person, "id" | "name" | "avatar"> {
  url: string;
  isProfilePrivate?: boolean;
  website?: string;
  books?: Array<Book>;
  description?: string;
  twitter?: {
    handle: string;
    url: string;
  };
  genres?: Array<{ name: string; link: string }>;
  rating?: string;
  ratingCount?: string;
  reviewCount?: string;
}
