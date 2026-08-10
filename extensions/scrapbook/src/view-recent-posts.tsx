import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PostType } from "./lib/types";
import Post from "./components/post";
import { ReactionsDropdown } from "./components/reactions-dropdown";
import { useReactionFiltering } from "./lib/hooks";

export default function ViewRecentPosts() {
  const {
    isLoading: isPostsLoading,
    data: postsData,
    revalidate: postsRevalidate,
  } = useFetch<PostType[]>("https://scrapbook.hackclub.com/api/posts", {
    parseResponse: (response) => {
      return response.json();
    },
  });

  const { selectedReaction, setSelectedReaction, filteredData } = useReactionFiltering(postsData || []);

  return (
    <List
      isLoading={isPostsLoading}
      searchBarAccessory={
        <ReactionsDropdown
          posts={postsData || []}
          selectedReaction={selectedReaction}
          setSelectedReaction={setSelectedReaction}
        />
      }
      isShowingDetail
    >
      {filteredData?.map((post: PostType) => (
        <Post
          key={post.id}
          post={post}
          setSelectedReaction={setSelectedReaction}
          revalidate={postsRevalidate}
          showAuthor
        />
      ))}
    </List>
  );
}
