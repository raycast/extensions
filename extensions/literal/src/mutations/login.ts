import { gql } from "@apollo/client";

export const LOG_IN = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      email
      languages
      profile {
        id
        handle
        name
        bio
        image
      }
    }
  }
`;
