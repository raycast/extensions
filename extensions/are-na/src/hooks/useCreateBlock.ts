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

import { useCallback } from "react";
import { useAsync } from "react-async";
import { api } from "../util/api";
import { useToken } from "./useToken";

export type CreateBlockParams =
  | {
      source: string;
    }
  | {
      content: string;
    };

interface UseCreateBlockOptions {
  slug: string;
}
export const useCreateBlock = ({ slug }: UseCreateBlockOptions) => {
  const path = `/channels/${slug}/blocks`;
  const accessToken = useToken();
  const deferFn = useCallback(
    async ([params]) => {
      await api(accessToken)("POST", path, params);
    },
    [accessToken, path]
  );

  return useAsync({
    deferFn,
  });
};
