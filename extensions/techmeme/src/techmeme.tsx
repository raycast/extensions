import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  EMPTY_TECHMEME_DATA,
  filterStories,
  formatStoryAsMarkdown,
  formatStoryDetailMarkdown,
  fetchTechmeme,
  fetchTechmemeRiver,
  searchTechmemeUrl,
  type LinkGroup,
  type Story,
} from "./lib/techmeme";

type StoryView = "frontpage" | "river";

export default function Command() {
  return <TechmemeBrowser />;
}

export function TechmemeBrowser(props: { initialView?: StoryView; lockedView?: boolean; navigationTitle?: string }) {
  const [searchText, setSearchText] = useState("");
  const [storyView, setStoryView] = useState<StoryView>(props.initialView ?? "frontpage");
  const fetchStories = props.lockedView && props.initialView === "river" ? fetchTechmemeRiver : fetchTechmeme;
  const { data, isLoading, revalidate } = useCachedPromise(fetchStories, [], {
    initialData: EMPTY_TECHMEME_DATA,
    keepPreviousData: true,
    failureToastOptions: {
      title: "Could not load Techmeme",
    },
  });

  const stories = storyView === "frontpage" ? data.frontpage : data.river;
  const filteredStories = useMemo(() => filterStories(stories, searchText), [searchText, stories]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      filtering={false}
      navigationTitle={props.navigationTitle ?? "Techmeme"}
      searchBarPlaceholder={storyView === "frontpage" ? "Search front page stories" : "Search the river"}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        props.lockedView ? undefined : <StoryViewDropdown value={storyView} onChange={setStoryView} />
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={searchText ? "No Matching Stories" : "No Stories Loaded"}
        description={searchText ? "Try a different search or open Techmeme search from the action panel." : undefined}
        actions={<EmptyActions searchText={searchText} revalidate={revalidate} />}
      />
      {filteredStories.map((story) => (
        <StoryItem
          key={`${storyView}-${story.id}`}
          story={story}
          searchText={searchText}
          revalidate={revalidate}
          showSubStoryIcon={storyView === "frontpage"}
        />
      ))}
    </List>
  );
}

function StoryViewDropdown(props: { value: StoryView; onChange: (value: StoryView) => void }) {
  return (
    <List.Dropdown tooltip="Feed" value={props.value} onChange={(value) => props.onChange(value as StoryView)}>
      <List.Dropdown.Item title="Front Page" value="frontpage" icon={Icon.AppWindowList} />
      <List.Dropdown.Item title="River" value="river" icon={Icon.Rss} />
    </List.Dropdown>
  );
}

function StoryItem(props: { story: Story; searchText: string; revalidate: () => void; showSubStoryIcon?: boolean }) {
  const { story, searchText, revalidate, showSubStoryIcon = false } = props;

  return (
    <List.Item
      id={story.id}
      icon={
        showSubStoryIcon && isSubStory(story)
          ? {
              value: { source: Icon.ChevronRightSmall, tintColor: Color.SecondaryText },
              tooltip: `Sub-story ${story.clusterPosition} of ${story.clusterSize}`,
            }
          : undefined
      }
      title={story.headline}
      subtitle={publicationFromSource(story.source)}
      keywords={[publicationFromSource(story.source), story.source, story.publishedLabel ?? ""].filter(Boolean)}
      detail={<List.Item.Detail markdown={formatStoryDetailMarkdown(story)} />}
      actions={<StoryActions story={story} searchText={searchText} revalidate={revalidate} />}
    />
  );
}

function StoryDetail(props: { story: Story; searchText: string; revalidate: () => void }) {
  const { story, searchText, revalidate } = props;

  return (
    <Detail
      navigationTitle={story.source}
      markdown={formatStoryDetailMarkdown(story)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Publication" text={publicationFromSource(story.source)} icon={Icon.Globe} />
          {story.source.includes("/") ? <Detail.Metadata.Label title="Byline" text={story.source} /> : null}
          {story.publishedLabel ? (
            <Detail.Metadata.Label title="Published" text={story.publishedLabel} icon={Icon.Clock} />
          ) : null}
          {story.clusterSize && story.clusterSize > 1 ? (
            <Detail.Metadata.Label
              title="Techmeme Cluster"
              text={`${story.clusterSize} stories`}
              icon={Icon.AppWindowList}
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Original" text={domainFromUrl(story.articleUrl)} target={story.articleUrl} />
          <Detail.Metadata.Link title="Techmeme" text="Permalink" target={story.permalink} />
        </Detail.Metadata>
      }
      actions={
        <StoryActions story={story} searchText={searchText} revalidate={revalidate} includeDetailsAction={false} />
      }
    />
  );
}

function StoryActions(props: {
  story: Story;
  searchText: string;
  revalidate: () => void;
  includeDetailsAction?: boolean;
}) {
  const { story, searchText, revalidate, includeDetailsAction = true } = props;
  const query = searchText.trim();
  const hasSocialLinks = Boolean(
    story.social.x || story.social.bluesky || story.social.threads || story.social.mastodon,
  );

  return (
    <ActionPanel title={story.source}>
      <ActionPanel.Section>
        {includeDetailsAction ? (
          <Action.Push
            title="Show Story Details"
            target={<StoryDetail story={story} searchText={searchText} revalidate={revalidate} />}
            icon={Icon.AppWindowSidebarRight}
          />
        ) : null}
        <Action.OpenInBrowser title="Open Story" url={story.articleUrl} icon={Icon.Globe} />
        <Action.OpenInBrowser
          title="Open Techmeme Permalink"
          url={story.permalink}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        />
      </ActionPanel.Section>

      {query ? (
        <ActionPanel.Section title="Search">
          <Action.OpenInBrowser
            title={`Search Techmeme for "${query}"`}
            url={searchTechmemeUrl(query)}
            icon={Icon.MagnifyingGlass}
          />
        </ActionPanel.Section>
      ) : null}

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={formatStoryAsMarkdown(story)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy Story URL"
          content={story.articleUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard title="Copy Techmeme URL" content={story.permalink} />
      </ActionPanel.Section>

      {story.sections.length ? (
        <ActionPanel.Section title="Coverage">
          {story.sections.map((group) => (
            <RelatedLinksSubmenu key={group.title} group={group} />
          ))}
        </ActionPanel.Section>
      ) : null}

      {hasSocialLinks ? (
        <ActionPanel.Section title="Social">
          {story.social.x ? (
            <Action.OpenInBrowser title="Open Techmeme Post on X" url={story.social.x} icon={Icon.Message} />
          ) : null}
          {story.social.bluesky ? (
            <Action.OpenInBrowser
              title="Open Techmeme Post on Bluesky"
              url={story.social.bluesky}
              icon={Icon.Message}
            />
          ) : null}
          {story.social.threads ? (
            <Action.OpenInBrowser
              title="Open Techmeme Post on Threads"
              url={story.social.threads}
              icon={Icon.Message}
            />
          ) : null}
          {story.social.mastodon ? (
            <Action.OpenInBrowser
              title="Open Techmeme Post on Mastodon"
              url={story.social.mastodon}
              icon={Icon.Message}
            />
          ) : null}
        </ActionPanel.Section>
      ) : null}

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function RelatedLinksSubmenu(props: { group: LinkGroup }) {
  return (
    <ActionPanel.Submenu title={props.group.title} icon={Icon.Link}>
      {props.group.links.map((link) => (
        <Action.OpenInBrowser
          key={link.url}
          title={link.source ? `${link.source}: ${link.title}` : link.title}
          url={link.url}
          icon={Icon.Globe}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function EmptyActions(props: { searchText: string; revalidate: () => void }) {
  const query = props.searchText.trim();

  return (
    <ActionPanel>
      {query ? (
        <Action.OpenInBrowser
          title={`Search Techmeme for "${query}"`}
          url={searchTechmemeUrl(query)}
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={props.revalidate}
      />
    </ActionPanel>
  );
}

function domainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function publicationFromSource(source: string): string {
  return source.split("/").at(-1)?.trim() || source;
}

function isSubStory(story: Story): boolean {
  return Boolean(story.clusterSize && story.clusterSize > 1 && story.clusterPosition && story.clusterPosition > 1);
}
