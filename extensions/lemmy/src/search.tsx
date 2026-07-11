import { List } from "@raycast/api";
import { CommunityView, PersonView, PostView } from "lemmy-js-client";
import { useEffect, useState } from "react";
import { search } from "./utils/search";
import CommunityItem from "./components/CommunityItem";
import UserItem from "./components/UserItem";
import PostItem from "./components/PostItem";

const Search = () => {
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [communities, setCommunities] = useState<CommunityView[]>([]);
  const [posts, setPosts] = useState<PostView[]>([]);
  const [users, setUsers] = useState<PersonView[]>([]);

  const doSearch = async () => {
    setLoading(true);
    const results = await search(searchText);
    setCommunities(results.communities);
    setPosts(results.posts);
    setUsers(results.users);
    setLoading(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!searchText) {
      setCommunities([]);
      setPosts([]);
      setUsers([]);
      return;
    }
    doSearch();
  }, [searchText]);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Lemmy"
      searchBarPlaceholder="Search for communities, users and posts"
      isShowingDetail={!!searchText && !loading}
    >
      {communities.length > 0 && (
        <List.Section title="Communities">
          {communities.map((community) => (
            <CommunityItem community={community} key={community.community.id} />
          ))}
        </List.Section>
      )}
      {users.length > 0 && (
        <List.Section title="Users">
          {users.map((user) => (
            <UserItem user={user} key={user.person.id} />
          ))}
        </List.Section>
      )}
      {posts.length > 0 && (
        <List.Section title="Posts">
          {posts.map((post) => (
            <PostItem post={post} key={post.post.id} />
          ))}
        </List.Section>
      )}
    </List>
  );
};

export default Search;
