import { gql } from "@apollo/client";

export default gql`
  mutation raycastDeleteLink($id: ID!) {
    linkDestroyById(input: { id: $id }) {
      status {
        success
        errors {
          messages
        }
      }
    }
  }
`;
