import { List } from "@raycast/api";
import ArticleComponent from "../components/Article";
import { useLeague } from "../contexts/leagueContext";
import { useShowDetails } from "../contexts/showDetailsContext";
import useNews from "../hooks/useNews";

const Articles = () => {
  const { value: league, setValue: setLeague, useLastValue } = useLeague();
  const { value: isShowingDetails, setValue: setIsShowingDetails } = useShowDetails();

  const { data, isLoading } = useNews(league);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetails}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select League"
          onChange={setLeague}
          {...(useLastValue ? { storeValue: true } : { defaultValue: league })}
        >
          <List.Dropdown.Item title="NBA" value="nba" />
          <List.Dropdown.Item title="WNBA" value="wnba" />
        </List.Dropdown>
      }
    >
      {data?.map((article) => (
        <ArticleComponent
          key={article.title}
          article={article}
          isShowingDetail={isShowingDetails}
          setIsShowingDetail={setIsShowingDetails}
        />
      ))}
    </List>
  );
};

export default Articles;
