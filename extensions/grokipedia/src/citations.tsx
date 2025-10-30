import { List, ActionPanel, Action, Icon } from "@raycast/api";
import type { Image } from "@raycast/api";
import { useState, useMemo } from "react";
import type { Citation } from "./types";
import { sanitizeMarkdown } from "./utils/markdown";
import { safeParseUrl, getFaviconForUrl } from "./utils/url";

export default function CitationsList(props: { citations: Citation[]; title?: string }) {
  const { citations = [], title } = props;
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return citations;
    return citations.filter((c) => {
      const t = (c.title || "").toLowerCase();
      const d = (c.description || "").toLowerCase();
      const u = (c.url || "").toLowerCase();
      return t.includes(q) || d.includes(q) || u.includes(q);
    });
  }, [citations, searchText]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={title ? `${title} — Citations` : "Citations"}
      throttle
      searchBarPlaceholder="Search citations..."
      isShowingDetail
    >
      {filtered.length === 0 && <List.EmptyView title="No citations" description="No citations matched your search." />}
      {filtered.map((c, idx) => {
        const displayTitle = (() => {
          const raw = c.title || c.url || "Untitled citation";
          const clean = sanitizeMarkdown(raw);
          return clean.length > 140 ? `${clean.slice(0, 137).trimEnd()}…` : clean;
        })();

        let iconSource: Image.ImageLike | string = Icon.Link as unknown as string;
        let hostnameText = "";

        if (c.url) {
          const parsed = safeParseUrl(c.url);
          if (parsed) {
            hostnameText = parsed.hostname;
            const favicon = getFaviconForUrl(parsed.href);
            iconSource = favicon ?? Icon.Link;
          } else {
            iconSource = Icon.Link;
            hostnameText = "";
          }
        }

        return (() => {
          const fullTitle = sanitizeMarkdown(c.title || c.url || "Untitled citation");
          const fullDescription = sanitizeMarkdown(c.description || "");
          const parsedForDetail = c.url ? safeParseUrl(c.url) : null;
          const urlHref = parsedForDetail ? parsedForDetail.href : c.url || "";

          const detailMarkdown = [
            `### Title`,
            `${fullTitle}`,
            "",
            `### Description`,
            `${fullDescription || "_No description_"}`,
            "",
            `### URL`,
            `${urlHref ? `<${urlHref}>` : "_No URL_"}`,
          ].join("\n");

          return (
            <List.Item
              key={`${c.id || c.url || idx}`}
              icon={iconSource}
              title={displayTitle}
              accessories={[{ text: hostnameText }]}
              detail={<List.Item.Detail markdown={detailMarkdown} />}
              actions={
                <ActionPanel>
                  {c.url &&
                    (() => {
                      const p = safeParseUrl(c.url);
                      if (!p) return null;
                      return <Action.OpenInBrowser url={p.href} shortcut={{ modifiers: ["cmd"], key: "o" }} />;
                    })()}
                  {c.url &&
                    (() => {
                      const p = safeParseUrl(c.url);
                      if (!p) return null;
                      return (
                        <Action.CopyToClipboard
                          content={p.href}
                          title="Copy URL"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      );
                    })()}
                  <Action.CopyToClipboard
                    content={displayTitle || c.url || ""}
                    title="Copy Title"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                </ActionPanel>
              }
            />
          );
        })();
      })}
    </List>
  );
}
