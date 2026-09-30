import { gql } from "@apollo/client";

export const CREATE_REVIEW = gql`
  mutation createReview($bookId: String!, $text: String, $spoiler: Boolean!, $rating: Float!, $tags: [String!]) {
    createReview(bookId: $bookId, text: $text, spoiler: $spoiler, rating: $rating, tags: $tags) {
      ...ReviewParts
    }
  }
  fragment ReviewParts on Review {
    id
    rating
    spoiler
    text
    createdAt
    updatedAt
    tags
  }
`;
