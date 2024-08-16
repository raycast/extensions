import useNews from "../hooks/useNews";
import ArticleComponent from "../components/Article";
import { useState } from "react";
import { List } from "@raycast/api";

const Articles = () => {
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [selectedLeague, setSelectedLeague] = useState<string>("nba");
  const { data, isLoading } = useNews(selectedLeague);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Select League" storeValue onChange={(value) => setSelectedLeague(value)}>
          <List.Dropdown.Item title="NBA" value="nba" />
          <List.Dropdown.Item title="WNBA" value="wnba" />
        </List.Dropdown>
      }
    >
      {data?.map((article) => (
        <ArticleComponent
          key={article.title}
          article={article}
          isShowingDetail={isShowingDetail}
          setIsShowingDetail={setIsShowingDetail}
        />
      ))}
    </List>
  );
};

export default Articles;
