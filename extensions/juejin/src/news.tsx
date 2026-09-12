import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { RecommendNews } from "./model/recommendNews";
import { RecommendFeedCategory } from "./utils/recommendFeedCategory";
import { RecommendFeedItem } from "./components/recommendFeedItem";
import RecommendFeedCategoryDropdown from "./components/recommendFeedCategoryDropdown";
import { requestRecommendFeed } from "./recommend/recommend";

interface RecommendList {
  list: RecommendNews[];
}

export default function Command() {
  const [list, setList] = useState<RecommendList>({ list: [] });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  let category = RecommendFeedCategory.iOS;

  function fetchRecommendFeed() {
    setIsLoading(true);
    requestRecommendFeed(
      category,
      (list: RecommendNews[]) => {
        setIsLoading(false);
        setList({ list: list });
      },
      (err: string) => {
        setIsLoading(false);
        showToast({
          title: "Get recommend list failed",
          message: err,
          style: Toast.Style.Failure,
        });
      },
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <RecommendFeedCategoryDropdown
          onChange={(value) => {
            category = value;
            fetchRecommendFeed();
          }}
        />
      }
    >
      {list.list.length === 0 ? (
        <List.EmptyView />
      ) : (
        list.list.map((item, index) => {
          return (
            <RecommendFeedItem
              key={item.articleId}
              index={index}
              articleId={item.articleId}
              title={item.title}
              readTime={item.readTime}
              viewCount={item.viewCount.toString()}
              commentCount={item.commentCount.toString()}
            />
          );
        })
      )}
    </List>
  );
}
