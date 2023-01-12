import { Action, ActionPanel, Detail, List, Icon } from "@raycast/api";
import React from "react";
import sanitizeHtml from "sanitize-html";
import { News } from "./api";
import { formatDate } from "./utils";

interface Props {
  news: News;
}

export default class NewsItem extends React.Component<Props> {
  get accessories() {
    return [{ date: this.props.news.date }];
  }

  get actions() {
    return (
      <ActionPanel>
        <Action.Push title="Read" icon={Icon.AppWindowSidebarRight} target={this.details} />
        <Action.OpenInBrowser url={this.props.news.url} />
      </ActionPanel>
    );
  }

  get details() {
    const markdown: string[] = [`# ${this.props.news.headline}`];

    if (this.props.news.image) {
      const { caption, url } = this.props.news.image;

      markdown.push(`![${caption}](${url})`);
    }

    markdown.push(sanitizeHtml(this.props.news.html, { allowedTags: [] }));

    return (
      <Detail
        markdown={markdown.join("\n\n")}
        navigationTitle={this.props.news.headline}
        metadata={this.detailsMetadata}
      />
    );
  }

  get detailsMetadata() {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Published on" text={formatDate(this.props.news.date)} />
        <Detail.Metadata.Label title="Authors" text={this.props.news.by} />
        <Detail.Metadata.Link title="Open in Browser" target={this.props.news.url} text={this.props.news.url} />
        <Detail.Metadata.Separator />
        {this.detailsMetadataTags}
      </Detail.Metadata>
    );
  }

  get detailsMetadataTags() {
    const tags = this.props.news.tags.map((tag) => (
      <Detail.Metadata.TagList.Item text={tag.name} key={tag.canonicalName} />
    ));

    return <Detail.Metadata.TagList title="Tags">{tags}</Detail.Metadata.TagList>;
  }

  render() {
    return (
      <List.Item
        key={this.props.news.id}
        title={this.props.news.headline}
        accessories={this.accessories}
        actions={this.actions}
      />
    );
  }
}
