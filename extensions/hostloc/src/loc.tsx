import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect } from "react";
import got from "got";
import useSwr from "swr";
import Parser from "rss-parser";

const parser = new Parser<{ items: Post[] }>();

type Post = {
  creator: string;
  title: string;
  link: string;
  author: string;
  content: string;
  categories: string[];
  isoDate: Date;
};

const fetcher = (url: string) =>
  got(url)
    .text()
    .then((res) => parser.parseString(res));

export default function PostList() {
  const { data, error } = useSwr("https://hostloc.com/forum.php?mod=rss&fid=45&orderby=dateline", fetcher);

  useEffect(() => {
    error && showToast(Toast.Style.Failure, "Could not load posts");
  }, [error]);

  return (
    <List isLoading={!data && !error} searchBarPlaceholder="Filter posts by name...">
      {data?.items.map((post, index) => (
        <PostItem key={post.link} post={post} index={index} />
      ))}
    </List>
  );
}

const PostItem: React.FC<{ post: Post; index: number }> = ({ post, index }) => {
  return (
    <List.Item
      id={post.link}
      key={post.link}
      title={`${index + 1}. ${post.title}`}
      subtitle={post.content}
      accessories={[{ text: post.author, icon: Icon.Person, tooltip: new Date(post.isoDate).toString() }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={post.link} />
          <Action.CopyToClipboard content={post.link} />
        </ActionPanel>
      }
    />
  );
};
