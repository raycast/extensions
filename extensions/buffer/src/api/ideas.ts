import { gql } from "./client";
import type { CreateIdeaInput, CreatedIdea } from "./types";

const CREATE_IDEA = `
  mutation CreateIdea($input: CreateIdeaInput!) {
    createIdea(input: $input) {
      ... on Idea {
        id
        organizationId
        createdAt
        content {
          title
          text
        }
      }
      ... on IdeaResponse {
        idea {
          id
          organizationId
          createdAt
          content {
            title
            text
          }
        }
      }
      ... on InvalidInputError {
        message
      }
      ... on LimitReachedError {
        message
      }
    }
  }
`;

export async function createIdea(input: CreateIdeaInput): Promise<CreatedIdea> {
  interface IdeaResult {
    createIdea:
      | CreatedIdea
      | { idea: CreatedIdea; refreshIdeas?: boolean }
      | { message: string };
  }

  const data = await gql<IdeaResult>(CREATE_IDEA, {
    input: {
      organizationId: input.organizationId,
      content: {
        title: input.title,
        text: input.text,
      },
    },
  });

  const result = data.createIdea;

  // Handle error union types
  if ("message" in result) {
    throw new Error(result.message);
  }

  // Handle IdeaResponse wrapper
  if ("idea" in result) {
    return result.idea;
  }

  return result as CreatedIdea;
}
