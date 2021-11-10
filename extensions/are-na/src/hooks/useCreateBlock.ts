/** 
 * post to /v2/channels/:slug/blocks 
 * 
 * 

Resource URL:
http://api.are.na/v2/channels/:slug/blocks

Parameters:
:source (required*)
URL of content. Can be an Image, Embed, or Link.

:content (required*)
Textual content that's rendered with Github Flavored Markdown.

Either *:source or :content is required. Not both.

Creates a new block and adds it to the specified channel.

*/

import { useMutation, UseMutationOptions } from "react-query";
import { api } from "../util/api";

export type CreateBlockParams =
  | {
      source: string;
    }
  | {
      content: string;
    };

interface UseCreateBlockOptions extends UseMutationOptions<unknown, unknown, CreateBlockParams, unknown> {
  slug: string;
  accessToken: string;
}
export const useCreateBlock = ({ accessToken, slug, ...options }: UseCreateBlockOptions) => {
  const path = `/channels/${slug}/blocks`;
  return useMutation({
    ...options,
    mutationFn: (variables: CreateBlockParams) => {
      return api(accessToken)("POST", path, variables);
    },
  });
};
