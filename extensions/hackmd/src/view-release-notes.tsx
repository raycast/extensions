import { useMemo, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import MiniSearch from "minisearch";
import { Content, Root, PhrasingContent } from "mdast";
import { remark } from "remark";
import { toMarkdown } from "mdast-util-to-markdown";

import api from "./lib/api";
import { useCachedPromise } from "@raycast/utils";
import { getNoteUrl } from "./helpers/noteHelper";

function astToMarkdown(contents: Content[]) {
  return toMarkdown({ type: "root", children: contents as PhrasingContent[] });
}

function getVersionFromHeading2Node(heading: Content) {
  return (heading as unknown as Root).children
    .filter((c) => c.type === "text")
    .map((c) => (c as { value: string }).value)
    .join("");
}

export default function Releases() {
  const { data: note, isLoading } = useCachedPromise(() => api.getNote("release-notes"));
  const [search, setSearch] = useState("");
  const noteUrl = useMemo(() => (note && getNoteUrl(note)) || "", [note]);

  const sections = useMemo(() => {
    if (note?.content) {
      const ast = remark.parse(note?.content);
      const heading2 = ast.children
        .map((node, index) => [node, index] as [Content, number])
        .filter(([node]) => node.type === "heading" && node.depth === 2);

      // group sections by heading 2 indexes
      const sections = heading2.reduce((acc, [content, index], headingIndex) => {
        const contents: Content[] = [content];

        if (headingIndex !== heading2.length - 1) {
          const nextIndex = heading2[headingIndex + 1][1];
          contents.push(...ast.children.slice(index + 1, nextIndex));
        } else {
          contents.push(...ast.children.slice(index + 1));
        }

        acc.push(contents);

        return acc;
      }, [] as Content[][]);

      return sections;
    } else {
      return [];
    }
  }, [note]);

  const sectionsChangelogMap = useMemo(() => {
    return sections.reduce(
      (acc, [heading, ...contents]) => {
        const version = getVersionFromHeading2Node(heading);
        acc[version] = astToMarkdown(contents);
        return acc;
      },
      {} as { [version: string]: string },
    );
  }, [sections]);

  const searchIndex = useMemo(() => {
    const miniSearch = new MiniSearch({
      fields: ["title", "content"],
      storeFields: ["title"],
      searchOptions: {
        fuzzy: 0.2,
      },
    });

    miniSearch.addAll(
      Object.entries(sectionsChangelogMap).map(([version, content]) => ({
        id: version,
        title: version,
        content: content,
      })),
    );

    return miniSearch;
  }, [sectionsChangelogMap]);

  const searchResults = useMemo(() => {
    return searchIndex.search(search);
  }, [searchIndex, search]);

  return (
    <List isShowingDetail isLoading={isLoading} filtering={false} onSearchTextChange={(value) => setSearch(value)}>
      {sections
        .filter((section) => {
          if (search) {
            const [heading] = section;
            const version = getVersionFromHeading2Node(heading);

            return !!searchResults.find((result) => result.title === version) || version.includes(search);
          } else {
            return true;
          }
        })
        .map((section, index) => {
          const [heading] = section;
          const version = getVersionFromHeading2Node(heading);

          const changelog = sectionsChangelogMap[version];

          return (
            <List.Item
              key={index}
              title={version}
              detail={<List.Item.Detail markdown={changelog} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Release Notes" url={noteUrl} />
                  <Action.CopyToClipboard
                    title="Copy Changelog"
                    content={changelog}
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
