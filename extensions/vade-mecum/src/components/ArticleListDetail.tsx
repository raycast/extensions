import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Buffer } from "buffer";
import * as cheerio from "cheerio";
import { decode } from "iconv-lite";
import { useEffect, useState } from "react";
import { Article, Law } from "../types";
import { escapeRegex, removeDiacritics } from "../utils";

interface ArticleListDetailsProps {
  law: Law;
}

export default function ArticleListDetail({ law }: ArticleListDetailsProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);

  const { isLoading, data, error } = useFetch<string>(law.url, {
    parseResponse: async (response: Response) => {
      const arrayBuffer = await response.arrayBuffer();
      return decode(Buffer.from(arrayBuffer), "iso-8859-1");
    },
  });

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch articles", "Please try again later.");
  }

  useEffect(() => {
    if (data) {
      const $ = cheerio.load(data);
      const scrapedArticles: Article[] = [];
      let currentArticle: Article | null = null;

      $("p").each((_, element) => {
        let content = $(element).text();
        content = content.replace(/\s+/g, " ").trim();
        content = content.replace(/(?<=(Art\.|§)\s\d+)\s?o /g, "º ");

        if (content.startsWith("Art.")) {
          const titleMatch = content.match(/(Art\.\s\d+(\.\d+)*(º|°)?(-[A-Z])?)/);
          let title = "";
          if (titleMatch) {
            title = titleMatch[0];
          }

          if (title && content) {
            currentArticle = { title: title.trim(), content: content.trim() };
            scrapedArticles.push(currentArticle);
          }
        } else if (
          currentArticle &&
          (content.startsWith("§") ||
            /^[IVXLCDM]+\s-\s/.test(content) ||
            content.startsWith("Parágrafo único") ||
            /^[a-z]\)/.test(content))
        ) {
          currentArticle.content += `\n\n${content.trim()}`;
        }
      });

      setArticles(scrapedArticles);
    }
  }, [data]);

  useEffect(() => {
    setFilteredArticles(
      articles
        .map((article) => {
          let highlightedContent = article.content;
          const normalizedContent = removeDiacritics(article.content);

          if (searchText.trim() !== "") {
            const searchTokens = [];
            let currentToken = "";
            const normalizedSearchText = removeDiacritics(searchText);
            const searchTextWords = normalizedSearchText.trim().split(/\s+/);

            for (let i = 0; i < searchTextWords.length; i++) {
              currentToken += searchTextWords[i];
              if (
                i === searchTextWords.length - 1 ||
                normalizedContent.toLowerCase().indexOf((currentToken + " " + searchTextWords[i + 1]).toLowerCase()) ===
                  -1
              ) {
                searchTokens.push(currentToken);
                currentToken = "";
              } else {
                currentToken += " ";
              }
            }

            const regex = new RegExp(
              searchTokens.map((token) => `\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").join("|"),
              "gi",
            );

            const matches = [...normalizedContent.matchAll(regex)];
            let offset = 0;
            matches.forEach((match) => {
              if (match.index !== undefined) {
                const index = match.index + offset;
                highlightedContent =
                  highlightedContent.slice(0, index) +
                  "`" +
                  highlightedContent.slice(index, index + match[0].length) +
                  "`" +
                  highlightedContent.slice(index + match[0].length);
                offset += 2;
              }
            });
          }

          return { ...article, content: highlightedContent };
        })
        .filter((article) => {
          const normalizedContent = removeDiacritics(article.content);
          const normalizedSearchText = removeDiacritics(searchText);
          const searchTextWords = normalizedSearchText.trim().split(/\s+/);
          return searchTextWords.every((word) => {
            const escapedWord = escapeRegex(word);
            const regex = new RegExp(`\\b${escapedWord}`, "i");
            return word === "" || regex.test(normalizedContent);
          });
        }),
    );
  }, [searchText, articles]);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search articles"
      navigationTitle={law.name}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Articles">
        {filteredArticles.map((article, index) => (
          <List.Item
            key={index}
            title={article.title}
            icon={Icon.Paragraph}
            detail={<List.Item.Detail markdown={article.content} />}
            actions={
              <ActionPanel title={article.title}>
                <Action.Paste title="Paste Article in Active App" content={article.content} />
                <Action.CopyToClipboard title="Copy Article" content={article.content} />
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={law.url} shortcut={{ modifiers: ["opt", "cmd"], key: "o" }} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
