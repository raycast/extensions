import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { NuxtDocsLink } from "./types/docs";
import { getNuxtDocsUrl } from "./utils/search";
import NAV_TREE from "./data/nuxt-docs-nav";
import { flattenDocsTree, fetchNuxtDocMarkdown } from "./utils/docs";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sections, setSections] = useState<{ title: string; items: NuxtDocsLink[] }[]>([]);
  const [allLinks, setAllLinks] = useState<NuxtDocsLink[]>([]);

  useEffect(() => {
    const built = NAV_TREE.map((section) => {
      const items: NuxtDocsLink[] = [];
      if (section.title && section.path) {
        items.push({ title: section.title, path: section.path });
      }
      if (section.children && section.children.length) {
        for (let i = 0; i < section.children.length; i++) {
          const child = section.children[i];
          if (child.title && child.path) items.push({ title: child.title, path: child.path });
        }
      }
      return { title: section.title, items };
    });
    setSections(built);
    setAllLinks(flattenDocsTree(NAV_TREE));
    setIsLoading(false);
  }, []);

  const filtered = useMemo(() => {
    if (!searchText) return sections;
    const q = searchText.toLowerCase();
    const sectioned = sections
      .map((s) => ({
        title: s.title,
        items: s.items.filter((l) => l.title.toLowerCase().includes(q) || l.path.toLowerCase().includes(q)),
      }))
      .filter((s) => s.items.length > 0);

    // Deep matches that aren't already in sectioned items
    const shownPaths = new Set(sectioned.flatMap((s) => s.items.map((i) => i.path)));
    const deepMatches = allLinks
      .filter((l) => (l.title.toLowerCase().includes(q) || l.path.toLowerCase().includes(q)) && !shownPaths.has(l.path))
      .slice(0, 50); // cap to avoid huge lists

    if (deepMatches.length > 0) {
      return [...sectioned, { title: "More Results", items: deepMatches }];
    }

    return sectioned;
  }, [sections, allLinks, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search Nuxt docs (e.g., prerendering)"
    >
      {filtered.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Item
              key={item.path}
              icon={Icon.Book}
              title={item.title}
              subtitle={item.path}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in Browser"
                    icon={Icon.Globe}
                    onAction={async () => {
                      try {
                        const url = `${getNuxtDocsUrl()}${item.path}`;
                        await open(url);
                      } catch (e) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to open page",
                          message: String(e),
                        });
                      }
                    }}
                  />
                  <Action.OpenInBrowser title="Open at Nuxt.com" url={`${getNuxtDocsUrl()}${item.path}`} />
                  <Action
                    title="Copy Page Markdown"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    onAction={async () => {
                      try {
                        await showToast({
                          style: Toast.Style.Animated,
                          title: "Fetching markdown...",
                        });
                        const markdown = await fetchNuxtDocMarkdown(item.path);
                        await Clipboard.copy(markdown);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Markdown copied to clipboard",
                        });
                      } catch (e) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to copy markdown",
                          message: String(e),
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
