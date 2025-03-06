import { useEffect, useState, useCallback } from "react";
import { addToReadwise } from "./reader/index";
import { showToast, Toast, List, getPreferenceValues, closeMainWindow, PopToRootType } from "@raycast/api";
import { ArxivClient, ArticleMetadata } from "arxivjs";
import { createArticleNotionPage, findArticlePage, updateArticlePageReaderUrl } from "./notion/createArticlePage";
import { addReferencesToNotion } from "./notion/addReferencesToPage";
import { useDebounce } from "use-debounce";
import { ArticleItem } from "./components/articleItem";
import { ReaderRequestBody } from "./reader/types";
import { fetchPapers, parsePapers } from "./semanticScholar/api";
import { DataItem } from "./semanticScholar/types";
import { Preferences } from "./config/index";
import { filterArxivUrls } from "./utils/urlExtractor";
import { getPaperExplanation } from "./llm/explanations";
import { addExplanationsToNotion } from "./notion/addExplanationToPage";
import { Explanation } from "./llm/types";

const preferences = getPreferenceValues<Preferences>();
const READWISE_API_KEY = preferences.readerApiKey;
const OPENAI_API_KEY = preferences.openaiApiKey;

function createReaderRequestBody(article: ArticleMetadata): ReaderRequestBody {
  const readerRequestbody: ReaderRequestBody = {
    title: article.title,
    category: "pdf",
    url: article.pdf.replace(/^http:/, "https:"),
    tags: [...article.categoryNames],
    summary: article.summary,
    author: article.authors[0],
    published_at: article.date,
  };

  if (article.journal !== "None") {
    readerRequestbody.tags.push(article.journal);
  }

  return readerRequestbody;
}

export default function Command() {
  const client = new ArxivClient();

  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<Error>();
  const [debouncedText] = useDebounce(searchText, 1000, { leading: true });
  const [articlesMetadata, setArticlesMetadata] = useState<ArticleMetadata[]>([]);
  const [readerRequestBodies, setReaderRequestBodies] = useState<ReaderRequestBody[]>([]);
  const [notionPageIds, setNotionPageIds] = useState<string[]>([]);

  const updateReadwise = async (body: ReaderRequestBody, pageId: string) => {
    if (!READWISE_API_KEY || Object.keys(body).length === 0) return;

    const readwiseUrl = await addToReadwise(body);
    await updateArticlePageReaderUrl(pageId, readwiseUrl.url);
  };

  const fetchExplanationsAndPapers = async (body: ReaderRequestBody): Promise<[DataItem[], Explanation[]]> => {
    if (!OPENAI_API_KEY || body.summary === "") {
      return [await fetchPapers(body.url), []];
    }

    return Promise.all([fetchPapers(body.url), getPaperExplanation(OPENAI_API_KEY, body.summary)]);
  };

  const updatePageData = useCallback(async (body: ReaderRequestBody, pageId: string) => {
    try {
      if (!body || body.url === "" || pageId === "") return;

      await updateReadwise(body, pageId);

      const [referencesResponse, explanations] = await fetchExplanationsAndPapers(body);

      if (explanations.length > 0) {
        await addExplanationsToNotion(pageId, explanations);
      }

      await addReferencesToNotion(pageId, parsePapers(referencesResponse));
    } catch (e) {
      setError(new Error("Failed to add references and explanations to Notion"));
    }
  }, []);

  useEffect(() => {
    async function updateAllPages() {
      if (readerRequestBodies.length === 0 || notionPageIds.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `No new articles added`,
        });
        return;
      }

      let message = "references";
      if (OPENAI_API_KEY) {
        message = "explanations and references";
      }

      await showToast({
        style: Toast.Style.Animated,
        title: `Generating ${message} for ${articlesMetadata.length} articles...`,
      });

      await Promise.all(readerRequestBodies.map((body, index) => updatePageData(body, notionPageIds[index])));

      await showToast({
        style: Toast.Style.Success,
        title: `${readerRequestBodies.length} articles added!`,
      });
    }
    updateAllPages();
  }, [readerRequestBodies, notionPageIds, updatePageData]);

  const getArticles = useCallback(async (urls: string[]) => {
    try {
      const articleMetadatas = await Promise.all(urls.map((url) => client.getArticle(url)));
      setArticlesMetadata(articleMetadatas);
    } catch (e) {
      setError(new Error("Failed to fetch article metadata"));
    }
  }, []);

  useEffect(() => {
    const articleUrls = filterArxivUrls(debouncedText);
    getArticles(articleUrls);
  }, [debouncedText, getArticles]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const handleArticlePush = async () => {
    try {
      await closeMainWindow({ clearRootSearch: false, popToRootType: PopToRootType.Suspended });

      await showToast({
        style: Toast.Style.Animated,
        title: `${articlesMetadata.length} articles sent to Notion...`,
      });

      // Get articles that don't exist in Notion
      const articlesToAdd = await Promise.all(
        articlesMetadata.map(async (articleMetadata) => {
          const exists = await findArticlePage(articleMetadata.pdf);
          return exists ? null : articleMetadata;
        })
      );

      // Filter out articles that exist in Notion
      const newArticles = articlesToAdd.filter(Boolean) as ArticleMetadata[];

      await showToast({
        style: Toast.Style.Animated,
        title: `${newArticles.length} / ${articlesMetadata.length} articles being added...`,
      });

      const readerRequestBodies = newArticles.map((article) => createReaderRequestBody(article));
      const pageIds = await Promise.all(newArticles.map((article) => createArticleNotionPage(article)));

      setReaderRequestBodies(readerRequestBodies);
      setNotionPageIds(pageIds);
    } catch (e) {
      setError(new Error("Failed to add articles to Notion"));
    }
  };

  return (
    <List
      navigationTitle="Search Papers"
      searchBarPlaceholder="Search your paper"
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {articlesMetadata.map((article, index) => (
        <ArticleItem key={index} articleMetadata={article} onAction={handleArticlePush} />
      ))}
    </List>
  );
}
