export enum Status {
  WantToRead = "WANTS_TO_READ",
  Reading = "IS_READING",
  Finished = "FINISHED",
  StoppedReading = "DROPPED",
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  isbn10: string;
  isbn13: string;
  language: string;
  pageCount: number;
  publishedDate: string;
  publisher: string;
  cover: string;
  authors: Authors[];
}

interface Authors {
  id: string;
  name: string;
}

export interface ReadingState {
  id: string;
  book: Book;
  status: string;
  bookId: string;
  profileId: string;
  createdAt: string;
}
