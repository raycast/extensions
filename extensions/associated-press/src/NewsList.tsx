import { List } from "@raycast/api";
import React from "react";
import { News } from "./api";
import { categories, Category } from "./categories";
import NewsItem from "./NewsItem";

interface Props {
  category: Category["value"];
  news: News[];
  isLoading: boolean;
  onChangeCategory(value: Category["value"]): void;
}

export default class NewsList extends React.Component<Props> {
  getCategoriesBy(group: Category["group"]) {
    const list = categories.filter((category) => category.group === group);
    const items = list.map(({ value, label }) => <List.Dropdown.Item key={value} title={label} value={value} />);

    return (
      <List.Dropdown.Section title={group} key={group}>
        {items}
      </List.Dropdown.Section>
    );
  }

  get categoriesDropdown() {
    return (
      <List.Dropdown value={this.props.category} onChange={this.props.onChangeCategory} tooltip="Select a category">
        {this.getCategoriesBy("Popularity")}
        {this.getCategoriesBy("Type")}
        {this.getCategoriesBy("Location")}
      </List.Dropdown>
    );
  }

  render() {
    return (
      <List isLoading={this.props.isLoading} searchBarAccessory={this.categoriesDropdown}>
        {this.props.news.map((news: News) => (
          <NewsItem key={news.id} news={news} />
        ))}
      </List>
    );
  }
}
