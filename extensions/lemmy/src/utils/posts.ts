import { CommunityView, ListingType, PostView } from "lemmy-js-client";
import { client, getJwt } from "./lemmy";

export const getTimeline = async (timeline: ListingType) => {
  const posts = await client.getPosts({ auth: await getJwt(), type_: timeline });
  return posts.posts;
};

export const getCommunityPosts = async (community: CommunityView, query?: string) => {
  if (query) {
    const results = await client.search({
      auth: await getJwt(),
      community_id: community.community.id,
      q: query,
    });

    return results.posts;
  }

  const posts = await client.getPosts({
    auth: await getJwt(),
    community_id: community.community.id,
  });
  return posts.posts;
};

// judgePost takes a post and a score. Negative scores are downvotes, positive scores are upvotes.
export const judgePost = async (post: PostView, score: -1 | 0 | 1) => {
  try {
    await client.likePost({
      auth: await getJwt(),
      post_id: post.post.id,
      score,
    });
  } catch (e) {
    throw new Error((e as Error).message);
  }
};

export const savePost = async (post: PostView, save: boolean) => {
  try {
    await client.savePost({
      auth: await getJwt(),
      post_id: post.post.id,
      save,
    });
  } catch (e) {
    throw new Error((e as Error).message);
  }
};

export // search post title, body, url and creator name for all timelines
const searchPosts = (posts: PostView[], searchText: string): PostView[] => {
  return posts.filter((post) => {
    return (
      post.post.name.toLowerCase().includes(searchText.toLowerCase()) ||
      post.post.body?.toLowerCase().includes(searchText.toLowerCase()) ||
      post.post.url?.toLowerCase().includes(searchText.toLowerCase()) ||
      post.creator.name.toLowerCase().includes(searchText.toLowerCase())
    );
  });
};
