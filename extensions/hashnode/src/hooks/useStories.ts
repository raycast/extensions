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
};

export default function useStories(type: StoryType) {
  const { username } = getPreferenceValues<Preferences>();

  const { isLoading, data } = useCachedPromise(
    async () => {
      if (type === StoryType.USER) {
        const { user } = await gql<{ user: { posts: { nodes: Story[] } } }>(GET_USER_STORIES, { username });
        return user.posts.nodes.map((node) => node);
      } else {
        const { feed } = await gql<{ feed: EdgesNode<Story> }>(GET_PUBLIC_STORIES, { type });
        return feed.edges.map((edge) => edge.node);
      }
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return { isLoading, data };
}
