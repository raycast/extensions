import { Action, ActionPanel, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { createClient, Post } from "@suin/esa-api";
import useSWR from "swr";
import ListDetail from "./components/ListDetail";
import DropDown from "./components/DropDown";
import { SEARCH_OPTION_MD } from "./utils/constants";

const preferences = getPreferenceValues<Preferences>();

const config = [
  {
    team: preferences.primaryTeamName,
    token: preferences.primaryToken,
  },
  {
    team: preferences.secondaryTeamName,
    token: preferences.secondaryToken,
  },
].filter(({ team, token }) => team && token);

type Props = {
  arguments: {
    keyword: string;
  };
};

export default function Command(props: Props) {
  const [searchText, setSearchText] = useState(props.arguments.keyword || "");
  const [configNumber, setConfigNumber] = useState(0);
  const [isShowingDetail, setIsShowingDetail] = useState(preferences.isShowDetail === "true");

  let client = createClient({
    token: config[configNumber].token,
  });

  const fetcher = async (q: string) => {
    const teamName = config[configNumber].team;
    const {
      data: { posts: postsData },
    } = await client.getPosts({ teamName, sort: "best_match", q, perPage: 50 });

    return postsData;
  };

  const { data: posts, error } = useSWR<Post[]>(searchText ? searchText : null, fetcher);

  const dummyListItemText = searchText
    ? posts
      ? `${posts?.length} posts`
      : `searching for ${searchText}`
    : "Please type your search words";

  useEffect(() => {
    client = createClient({
      token: config[configNumber].token,
    });
  }, [configNumber]);

  useEffect(() => {
    if (error) {
      if (error.response.status === 401 || error.response.status === 404) {
        showToast(Toast.Style.Failure, "Invalid Credentials", "Check you esa team name or api token in preferences.");
      } else if (error.response.status === 429) {
        showToast(Toast.Style.Failure, "Requests has been exceeded", "Retry after 15 minutes.");
      } else {
        throw error;
      }
    }
  }, [error]);

  return (
    <List
      searchBarPlaceholder="Search words..."
      isLoading={!!searchText && !posts}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={isShowingDetail}
      throttle
      searchBarAccessory={<DropDown onChange={setConfigNumber} config={config} />}
    >
      <List.Item title="" subtitle={dummyListItemText} detail={<List.Item.Detail markdown={SEARCH_OPTION_MD} />} />
      <List.Section title="result">
        {posts?.map((item) => {
          return (
            <List.Item
              key={item.number}
              icon={{ source: Icon.BlankDocument }}
              title={item.name}
              accessories={isShowingDetail ? [] : [{ icon: Icon.Folder, text: item.full_name.replace(item.name, "") }]}
              detail={<ListDetail item={item} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action
                    icon={{ source: Icon.Eye }}
                    title="Toggle detail"
                    onAction={() => setIsShowingDetail(!isShowingDetail)}
                  />
                  <Action.CopyToClipboard content={item.url} shortcut={{ modifiers: ["ctrl"], key: "c" }} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
