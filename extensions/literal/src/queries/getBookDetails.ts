import { gql } from "@apollo/client";

export const GET_BOOK_DETAILS = gql`
  query GetBookByIsbn($isbn13: String!) {
    book(where: { isbn13: $isbn13 }) {
      ...BookPart
    }
  }
  fragment BookPart on Book {
    id
    slug
    title
    subtitle
    description
    isbn10
    isbn13
    language
    pageCount
    publishedDate
    publisher
    cover
    authors {
      id
      name
    }
  }
`;
