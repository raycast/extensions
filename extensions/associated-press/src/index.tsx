import React from "react";
import { getNews, News } from "./api";
import { categories, Category, defaultCategory } from "./categories";
import NewsList from "./NewsList";

export enum FETCH_STATUS {
  INITIAL = "INITIAL",
  FETCHING = "FETCHING",
  FETCHED = "FETCHED",
}

interface State {
  news: News[];
  status: FETCH_STATUS;
  category: Category["value"];
}

export default class App extends React.Component<null, State> {
  state = {
    news: [],
    status: FETCH_STATUS.INITIAL,
    category: defaultCategory.value,
  };

  componentDidMount(): void {
    const [{ value }] = categories;
    this.fetch(value);
  }

  fetch = async (category: Category["value"]) => {
    this.setState({
      ...this.state,
      category,
      status: FETCH_STATUS.FETCHING,
    });

    const news = await getNews(category);

    this.setState({
      ...this.state,
      news,
      status: FETCH_STATUS.FETCHED,
    });
  };

  render() {
    return (
      <NewsList
        isLoading={this.state.status !== FETCH_STATUS.FETCHED}
        news={this.state.news}
        onChangeCategory={this.fetch}
        category={this.state.category}
      />
    );
  }
}
