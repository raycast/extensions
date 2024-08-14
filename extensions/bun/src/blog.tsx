import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { useEffect, useState } from "react";
import Parser from "rss-parser";

import DocViewer, { DocViewerProps } from "./components/DocViewer";
import { bunBlogRssUrl } from "./constants";

const parser = new Parser();
interface State {
  items?: Parser.Item[];
  error?: unknown;
}

type BlogPostType = "changelog" | "other";
type BlogPostTypeFilter = "all" | BlogPostType;

const blogPostTypeIcons: Record<BlogPostType, Icon> = {
  changelog: Icon.BulletPoints,
  other: Icon.Paragraph,
};

interface BlogPostViewerProps extends DocViewerProps {}

function BlogPostViewer(props: BlogPostViewerProps) {
  return (
    <DocViewer
      type="html"
      fetchOptions={{
        async parseResponse(response) {
          const html = await response.text();
          const blogPostHtml = html.match(
            /<section.+?<div\s*class="prose.+?>\s*(.+?)\s*<\/article>.*?<\/div>.*?<\/section>/is,
          )?.[1];

          return blogPostHtml || html;
        },
      }}
      {...props}
    />
  );
}

export default function Command() {
  const [state, setState] = useState<State>({});

  const [searchQuery, setSearchQuery] = useState("");
  const searchQueryLowerCase = searchQuery.toLowerCase();

  const [blogPostTypeFilter, setBlogPostTypeFilter] = useState<BlogPostTypeFilter>("all");

  const [showDetails, setShowDetails] = useState(true);
  const showAccessories = !showDetails;

  useEffect(() => {
    async function fetchBlogPosts() {
      try {
        const feed = await parser.parseURL(bunBlogRssUrl);
        setState({ items: feed.items });
      } catch (error) {
        setState({
          error,
        });
      }
    }

    fetchBlogPosts();
  }, []);

  if (state.error) {
    showFailureToast(state.error, { title: "Failed to load Bun RSS feed" });
  }

  return (
    <List
      isLoading={!state.items && !state.error}
      onSearchTextChange={setSearchQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Blog post type"
          onChange={(newType) => {
            setBlogPostTypeFilter(newType as BlogPostTypeFilter);
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Changelogs" value="changelog" />
          <List.Dropdown.Item title="Other" value="other" />
        </List.Dropdown>
      }
      isShowingDetail={showDetails}
    >
      {state.items?.map((blogPost) => {
        if (!blogPost.content || !blogPost.link) {
          return;
        }

        if (searchQuery) {
          let doesMatch = false;
          for (const content of [blogPost.title, blogPost.content, blogPost.link]) {
            if (!content) {
              continue;
            }

            if (content.toLowerCase().includes(searchQueryLowerCase)) {
              doesMatch = true;
              break;
            }
          }

          if (!doesMatch) {
            return;
          }
        }

        const version = blogPost.link?.match(/\/blog\/bun-v(.+)$/)?.[1];
        const blogPostType: BlogPostType = version ? "changelog" : "other";

        if (blogPostTypeFilter != "all" && blogPostTypeFilter != blogPostType) {
          return;
        }

        const bugFixes = (blogPost.content.match(/(\d+)\s*bugs/i)?.[1] || "0")?.padEnd(5, "\u2002");
        const reactions = (blogPost.content.match(/(\d+)\s*\ud83d\udc4d\s*/)?.[1] || "0")?.padEnd(5, "\u2002");

        const title = blogPost.title || (blogPostType == "changelog" ? `Bun v${version}` : blogPost.link);
        const content = blogPost.content.replace(
          /^\s*(?:this\s*(?:release|version|update)\s*)?fixe[sd]\s*\d+\s*bugs\s*(?:\(\s*addressing\s*\d+\s*\ud83d\udc4d(?:\s*reactions)?\s*\)\s*)?[.,]?\s*([a-zA-Z])?/i,
          (_, firstLetter) => `${firstLetter?.toUpperCase() || ""}`,
        );

        return (
          <List.Item
            key={blogPost.link}
            icon={blogPostTypeIcons[blogPostType]}
            title={title}
            subtitle={content}
            accessories={
              showAccessories
                ? blogPostType == "changelog"
                  ? [
                      { icon: Icon.Bug, text: bugFixes },
                      {
                        icon: Icon.Heart,
                        text: reactions,
                      },
                    ]
                  : null
                : null
            }
            detail={<BlogPostViewer url={blogPost.link} listDetail />}
            actions={
              <ActionPanel title={title}>
                <ActionPanel.Section>
                  <Action.Push icon={Icon.Eye} title="View Blog Post" target={<BlogPostViewer url={blogPost.link} />} />
                  <Action.OpenInBrowser url={blogPost.link} />

                  <Action.CopyToClipboard
                    title="Copy Link"
                    content={blogPost.link}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                    title={`${showDetails ? "Hide" : "Show"} Preview`}
                    onAction={() => {
                      setShowDetails(!showDetails);
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
