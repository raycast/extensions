import useNews from "../hooks/useNews";
import ArticleComponent from "../components/Article";
import { useState } from "react";
import { List } from "@raycast/api";

const Articles = () => {
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  const { data, isLoading } = useNews();

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {data?.map((article) => {
        return (
          <ArticleComponent
            key={article.title}
            article={article}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        );
      })}
    </List>
  );
};

export default Articles;
