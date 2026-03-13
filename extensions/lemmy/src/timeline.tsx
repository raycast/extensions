import { List } from "@raycast/api";
import { PostView } from "lemmy-js-client";
import { useEffect, useState } from "react";
import { getTimeline, searchPosts } from "./utils/posts";
import PostItem from "./components/PostItem";

const Timeline = () => {
  const [loading, setLoading] = useState(false);

  const [subscribedPosts, setSubscribedPosts] = useState<PostView[]>([]);
  const [localPosts, setLocalPosts] = useState<PostView[]>([]);
  const [allPosts, setAllPosts] = useState<PostView[]>([]);

  const [searchText, setSearchText] = useState("");

  const init = async () => {
    setLoading(true);
    setSubscribedPosts(await getTimeline("Subscribed"));
    setLocalPosts(await getTimeline("Local"));
    setAllPosts(await getTimeline("All"));
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

    setSubscribedPosts(searchPosts(subscribedPosts, searchText));
    setLocalPosts(searchPosts(localPosts, searchText));
    setAllPosts(searchPosts(allPosts, searchText));
  }, [searchText]);

  return (
    <>
      <List
        isShowingDetail
        isLoading={loading}
        onSearchTextChange={setSearchText}
        navigationTitle="Search Timelines"
        searchBarPlaceholder="Search post titles, contents, linked URLs and authors"
      >
        {subscribedPosts.length > 0 && (
          <List.Section title="Subscribed">
            {subscribedPosts.map((post) => (
              <PostItem post={post} key={post.post.id} />
            ))}
          </List.Section>
        )}
        {localPosts.length > 0 && (
          <List.Section title="Local">
            {localPosts.map((post) => (
              <PostItem post={post} key={post.post.id} />
            ))}
          </List.Section>
        )}
        {allPosts.length > 0 && (
          <List.Section title="All">
            {allPosts.map((post) => (
              <PostItem post={post} key={post.post.id} />
            ))}
          </List.Section>
        )}
      </List>
    </>
  );
};

export default Timeline;
