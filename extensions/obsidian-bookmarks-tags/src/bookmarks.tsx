import { Action, ActionPanel, getPreferenceValues, Icon, List, preferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { CACHE_KEY } from "./refresh";
import { useEffect, useState } from 'react'
import { searchBookmarks } from "./fetch";


export interface Link {
  filename: string
  result: {
    text: string,
    tags: string[]
  }
}

export interface Preferences {
  vault: string
  tagName: string
}

type MarkdownLink = {
  text: string; 
  url: string; 
  markdownText: string; 
  tags: string[]; 
  keywords: string[];
  filename: string;
  obsidianURI: string
};

function parseMarkdownLinks(markdown: Link): MarkdownLink[] {
  const linkRegex = /\[([^\]]+)\]\((.+)\)/g;

  let markdownText = [...markdown.result.text.matchAll(linkRegex)]

  return markdownText.map(it => {
    let textOnly = markdown.result.text
    .replace(`[${it[1]}]`, it[1])
    .replace(`(${it[2]})`, '')

    return {
      text: textOnly,
      url: it[2],
      markdownText: markdown.result.text,
      tags: markdown.result.tags,
      keywords: (markdown.result.text + '/' + markdown.filename).split(/[^a-z]/i),  // filename + text
      obsidianURI: `obsidian://advanced-uri?filename=${encodeURI(markdown.filename)}`,
      filename: markdown.filename
    }
  })
}

function getLinks(data: Link[]): MarkdownLink[] {
  const dedup: string[] = []

  return data.flatMap(it => parseMarkdownLinks(it)).filter(it => it != null)
    .filter(it => {
      if (dedup.includes(it.url) || dedup.includes(it.text)) {
        return false
      } else {
        dedup.push(it.url)
        return true
      }
    })
}

export default function Command() {
  const [data, setData] = useCachedState<Link[]>(CACHE_KEY, [], { cacheNamespace: CACHE_KEY })

  let links = getLinks(data)

  return (
    <List
      navigationTitle="Search bookmarks"
      searchBarPlaceholder="Search bookmarks"
      isShowingDetail={true}
    >
      {links.map((item) => (
        <List.Item
          key={item.markdownText}
          title={item.text}
          // subtitle={{ value: item.subtitle, tooltip: item.url }}
          keywords={item.keywords}
          icon={Icon.Compass}
          detail={
            <List.Item.Detail markdown={`
**${item.text}**
            
- url: ${item.url}
- src: [${item.filename}](${item.obsidianURI})
- tag: ${item.tags}
            `} />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open"
                url={item.url}
              />
              <Item item={item} />
              <Action.CopyToClipboard
                title="Copy and paste"
                content={`[${item?.text}](${item?.url})`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                icon={Icon.Clipboard}
              />

            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Item(props: { item: MarkdownLink }) {
  const item = props.item
  return <Action.OpenInBrowser
    title="Open Obsidian Page"
    url={item.obsidianURI}
    icon={Icon.Pencil}
  />


}