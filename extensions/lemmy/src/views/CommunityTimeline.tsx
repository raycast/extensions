import { CommunityView, PostView } from "lemmy-js-client";
import { useEffect, useState } from "react";
import { getCommunityPosts } from "../utils/posts";
import { List } from "@raycast/api";
import PostItem from "../components/PostItem";

const CommunityTimeline = ({ community }: { community: CommunityView }) => {
  const [posts, setPosts] = useState<PostView[]>([]);

  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");

  const init = async () => {
    setLoading(true);
    setPosts(await getCommunityPosts(community));
    setLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!searchText) {
      init();
      return;
    }

    (async () => {
      setLoading(true);
      setPosts(await getCommunityPosts(community, searchText));
      setLoading(false);
    })();
  }, [searchText]);

  return (
    <List
      isShowingDetail
      isLoading={loading}
      onSearchTextChange={setSearchText}
      navigationTitle={`Search /c/${community.community.name}`}
      searchBarPlaceholder="Search post titles, contents, linked URLs and authors"
    >
      {posts.map((post) => (
        <PostItem post={post} key={post.post.id} />
      ))}
    </List>
  );
};

export default CommunityTimeline;
