import useNews from "../hooks/useNews";
import { Toast, showToast, List } from "@raycast/api";
import { Article } from "../types/news.types";
import ArticleComponent from "../components/Article";
import { useState } from "react";

const Articles = () => {
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  const data = useNews();

  if (data.error) {
    showToast(Toast.Style.Failure, "Failed to get news");
    data.loading = false;
  }

  return (
    <List isLoading={data.loading} isShowingDetail={isShowingDetail}>
      {data.news.map((article: Article) => {
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
