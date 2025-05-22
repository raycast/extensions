import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  searchArticles,
  fetchArticleDetail,
  extractArticleId,
} from "./api/client";
import { Article } from "./api/type";
import { formatDate } from "./utils/formatDate";

const MAX_TAGS = 6;

export default function Command() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [enrichedArticles, setEnrichedArticles] = useState<
    Map<string, Article>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  async function performSearch(query: string) {
    if (!query.trim()) {
      setArticles([]);
      setEnrichedArticles(new Map());
      return;
    }

    try {
      setIsLoading(true);
      const data = await searchArticles(query);
      setArticles(data || []);
      setEnrichedArticles(new Map());
    } catch (error) {
      console.error("Error searching articles:", error);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadArticleDetails(article: Article) {
    if (!article) return;

    const articleUrl = getArticleUrl(article);
    if (!articleUrl) return;

    const articleId = extractArticleId(articleUrl);
    if (!articleId || enrichedArticles.has(articleId)) return;

    try {
      setIsLoadingDetails(true);
      setSelectedArticleId(articleId);

      const detail = await fetchArticleDetail(articleId);
      setEnrichedArticles((prev) => {
        const updated = new Map(prev);
        updated.set(articleId, detail);
        return updated;
      });
    } catch (error) {
      console.error("Error loading article details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  function getArticleUrl(article: Article): string {
    if (article.fullUrl) return article.fullUrl;

    if (article.url) {
      let fixedUrl = article.url;

      fixedUrl = fixedUrl.replace("https://www.publico.pthttps//", "https://");
      fixedUrl = fixedUrl.replace("https://www.publico.pthttps/", "https://");
      fixedUrl = fixedUrl.replace("https//", "https://");

      if (!fixedUrl.includes("publico.pt") && !fixedUrl.startsWith("http")) {
        fixedUrl = `https://www.publico.pt${fixedUrl.startsWith("/") ? "" : "/"}${fixedUrl}`;
      }

      return fixedUrl;
    }

    return "https://www.publico.pt";
  }

  function cleanDescription(description: string | undefined): string {
    if (!description) return "";

    const patterns = [
      /^(há|hÃ¡)\s+\d+\s+(horas?|dias?|semanas?|meses?)(?:\s*\.{3}|\s+\.\.\.|…)\s*/i,
      /^h[aá]\s+\d+\s+(?:horas?|dias?|semanas?|meses?)(?:\s*\.{3}|\s+\.\.\.|…)\s*/i,
    ];

    let cleanedDesc = description;

    for (const pattern of patterns) {
      const match = cleanedDesc.match(pattern);
      if (match) {
        cleanedDesc = cleanedDesc.substring(match[0].length);
        break;
      }
    }

    return cleanedDesc;
  }

  function formatAuthors(autores: Article["autores"]): string {
    if (!autores) return "Not available";

    if (Array.isArray(autores)) {
      const authorNames = autores
        .filter(
          (author) => author && (typeof author === "string" || author.nome),
        )
        .map((author) => (typeof author === "string" ? author : author.nome));
      return authorNames.length > 0 ? authorNames.join(", ") : "Not available";
    }

    if (typeof autores === "object" && autores !== null) {
      if ("nome" in autores) return autores.nome;
      if ("name" in autores && typeof autores.name === "string")
        return autores.name;
    }

    if (typeof autores === "string") {
      return autores;
    }

    return "Not available";
  }

  function extractTags(tags: Article["tags"]): string[] {
    if (!tags) return [];

    if (Array.isArray(tags)) {
      try {
        return tags
          .map((tag) => {
            if (typeof tag === "string") return tag;
            if (typeof tag === "object" && tag !== null) {
              return (
                tag.nome ||
                tag.name ||
                tag.value ||
                tag.titulo ||
                tag.title ||
                (tag.toString && tag.toString() !== "[object Object]"
                  ? tag.toString()
                  : "")
              );
            }
            return String(tag);
          })
          .filter(
            (tag) =>
              tag &&
              tag !== "undefined" &&
              tag !== "null" &&
              tag !== "[object Object]",
          );
      } catch (e) {
        console.error("Error extracting tags:", e);
        return [];
      }
    }

    if (typeof tags === "string") {
      return [tags];
    }

    return [];
  }

  function getTagColor(index: number): Color.ColorLike {
    const colors = [
      "#B22222",
      "#4B0082",
      "#006400",
      "#8B4513",
      "#4682B4",
      "#800080",
      "#FF8C00",
      "#2F4F4F",
    ];
    return colors[index % colors.length];
  }

  function getArticleIcon(
    article: Article,
  ): { source: string } | { text: string; tintColor: string } {
    if (
      article.multimediaPrincipal &&
      typeof article.multimediaPrincipal === "string"
    ) {
      return { source: article.multimediaPrincipal };
    }

    if (
      article.multimediaPrincipal &&
      typeof article.multimediaPrincipal === "object" &&
      article.multimediaPrincipal.src
    ) {
      return { source: article.multimediaPrincipal.src };
    }

    if (
      article.imagem &&
      typeof article.imagem === "object" &&
      article.imagem.src
    ) {
      return { source: article.imagem.src };
    }

    const letter = article.titulo
      ? article.titulo.charAt(0).toUpperCase()
      : "P";
    return { text: letter, tintColor: "#1E90FF" };
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Público news..."
      isShowingDetail
      throttle
      onSelectionChange={(id) => {
        if (!id) return;
        const selectedArticle = articles.find(
          (_, index) => `article-${index}` === id,
        );
        if (selectedArticle) {
          loadArticleDetails(selectedArticle);
        }
      }}
    >
      {searchText.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Público News"
          description="Start typing to search for articles."
        />
      ) : articles.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.XmarkCircle}
          title="No Articles Found"
          description={`No results found for '${searchText}'. Try a different search term.`}
        />
      ) : (
        articles.map((article, index) => {
          const cleanTitle =
            article.titulo?.replace(/<[^>]*>/g, "") || "Untitled";
          const articleUrl = getArticleUrl(article);
          const articleId = extractArticleId(articleUrl);
          const enrichedData = articleId
            ? enrichedArticles.get(articleId)
            : null;

          const authorText = enrichedData?.autores
            ? formatAuthors(enrichedData.autores)
            : formatAuthors(article.autores);

          const allTags = enrichedData?.tags
            ? extractTags(enrichedData.tags)
            : extractTags(article.tags);
          const tags = allTags.slice(0, MAX_TAGS);

          const publishedDate = enrichedData?.data
            ? enrichedData.data.includes("0001-01-01")
              ? "Not available"
              : formatDate(enrichedData.data)
            : article.data
              ? article.data.includes("0001-01-01")
                ? "Not available"
                : formatDate(article.data)
              : article.time
                ? formatDate(article.time)
                : "Not available";

          const icon = getArticleIcon(article);
          const cleanedDescription = cleanDescription(article.descricao);
          const isSelected =
            articleId === selectedArticleId && isLoadingDetails;
          const detailMarkdown = `# ${cleanTitle}\n\n---\n\n${cleanedDescription}\n`;

          return (
            <List.Item
              key={`article-${index}`}
              id={`article-${index}`}
              icon={icon}
              title={cleanTitle}
              detail={
                <List.Item.Detail
                  isLoading={isSelected}
                  markdown={detailMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Author"
                        text={authorText}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Published"
                        text={publishedDate}
                      />
                      {tags.length > 0 ? (
                        <List.Item.Detail.Metadata.TagList title="Keywords">
                          {tags.map((tag, tagIndex) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={`tag-${tagIndex}`}
                              text={tag}
                              color={getTagColor(tagIndex)}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.Label
                          title="Keywords"
                          text="Not available"
                          icon={Icon.Tag}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={articleUrl}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={articleUrl}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
