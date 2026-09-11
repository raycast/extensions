import { gql } from "./client";
import { validateUrl } from "../helpers/validation";
import type { CreatePostInput, CreatedPost } from "./types";

const CREATE_POST = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post {
          id
          status
          text
          dueAt
          sentAt
          createdAt
          channelId
          channelService
          shareMode
          externalLink
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

export async function createPost(input: CreatePostInput): Promise<CreatedPost> {
  // Link attachment is mutually exclusive with a non-empty asset list
  if (
    input.metadata?.facebook?.linkAttachment &&
    (input.assets?.length ?? 0) > 0
  ) {
    throw new Error(
      "A link attachment cannot be combined with image or video assets",
    );
  }
  if (input.metadata?.facebook?.linkAttachment) {
    validateUrl(
      input.metadata.facebook.linkAttachment.url,
      "Link attachment URL",
    );
  }

  // Validate media URLs before sending
  for (const asset of input.assets ?? []) {
    if (asset.image) {
      validateUrl(asset.image.url, "Image URL");
      if (asset.image.thumbnailUrl) {
        validateUrl(asset.image.thumbnailUrl, "Image thumbnail URL");
      }
    }
    if (asset.video) {
      validateUrl(asset.video.url, "Video URL");
    }
    if (asset.document) {
      validateUrl(asset.document.url, "Document URL");
      validateUrl(asset.document.thumbnailUrl, "Document thumbnail URL");
    }
    if (asset.link) {
      validateUrl(asset.link.url, "Link URL");
      if (asset.link.thumbnailUrl) {
        validateUrl(asset.link.thumbnailUrl, "Link thumbnail URL");
      }
    }
  }

  interface PostResult {
    createPost:
      | { post: CreatedPost }
      | { message: string; code?: string; link?: string };
  }

  const data = await gql<PostResult>(CREATE_POST, {
    input: { ...input, assets: input.assets ?? [] },
  });

  const result = data.createPost;

  // Handle error union types
  if ("message" in result) {
    throw new Error(result.message);
  }

  return result.post;
}
