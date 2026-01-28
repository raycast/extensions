import { getPreferenceValues } from "@raycast/api";
import { Story } from "../models/Story";
import { StoryType } from "../models/StoryType";
import { GET_PUBLIC_STORIES, GET_USER_STORIES } from "../queries";
import { gql } from "../utils";
import { useCachedPromise } from "@raycast/utils";

type EdgesNode<T> = {
  edges: Array<{
    node: T;
  }>;
  pageInfo: { hasNextPage: boolean; endCursor: string };
};

export default function useStories(type: StoryType) {
  const { username } = getPreferenceValues<Preferences>();

  const { isLoading, data, pagination } = useCachedPromise(
    () => async (options) => {
      if (type === StoryType.USER) {
        const { user } = await gql<{
          user: { posts: { nodes: Story[]; pageInfo: { hasNextPage: boolean; nextPage: string | null } } } | null;
        }>(GET_USER_STORIES, { username, page: options.page + 1 });
        return {
          data: user?.posts.nodes.map((node) => node) ?? [],
          hasMore: user?.posts.pageInfo.hasNextPage ?? false,
        };
      } else {
        const { feed } = await gql<{ feed: EdgesNode<Story> }>(GET_PUBLIC_STORIES, { type, after: options.cursor });
        return {
          data: feed.edges.map((edge) => edge.node),
          hasMore: feed.pageInfo.hasNextPage,
          cursor: feed.pageInfo.endCursor ?? "",
        };
      }
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return { isLoading, data, pagination };
}
