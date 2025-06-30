import { gql } from "@apollo/client";

export const UPDATE_STATUS = gql`
  mutation updateReadingState(
    $bookId: String!
    $readingStatus: ReadingStatus! # find fragments below
  ) {
    updateReadingState(bookId: $bookId, readingStatus: $readingStatus) {
      ...ReadingStatePart # find fragments below
      book {
        ...Books # find fragments below
      }
    }
  }
  fragment ReadingStatePart on ReadingState {
    id
    status
    bookId
    profileId
    createdAt
  }
  fragment Books on Book {
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
    gradientColors
  }
`;
