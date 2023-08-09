import { useEffect, useState } from "react";
import { addToReadwise } from "./reader/index";
import { showToast, Toast, List, getPreferenceValues } from "@raycast/api";
// import { setTimeout } from "timers/promises";
import { ArxivClient, ArticleMetadata } from "arxivjs";
import { createArticleNotionPage, updateArticlePageReaderUrl } from "./notion/createArticlePage";
import { addReferencesToNotion } from "./notion/addReferencesToPage";
import { useDebounce } from "use-debounce";
import { ArticleItem } from "./components/articleItem";
import { ReaderRequestBody, ReaderResponse } from "./reader/types";
import { fetchPapers, parsePapers } from "./semanticScholar/api";
import { DataItem } from "./semanticScholar/types";
import { Preferences } from "./config/index";

const preferences = getPreferenceValues<Preferences>();

const READWISE_API_KEY = preferences.readerApiKey;

export default function Command() {
  const client = new ArxivClient();

  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<Error>();
  const [debouncedText] = useDebounce(searchText, 1000, { leading: true });
  const [articleMetadata, setArticleMetadata] = useState({} as ArticleMetadata);
  const [body, setBody] = useState({} as ReaderRequestBody);
  const [pageId, setPageId] = useState("");

  useEffect(() => {
    async function updateUrl() {
      try {
        if (body && body.url !== "" && pageId !== "") {
          await updateArticlePageReaderUrl(pageId, body.url);
          if (READWISE_API_KEY && Object.keys(body).length > 0) {
            await addToReadwise(body);
          }

          const referencesResponse: DataItem[] = await fetchPapers(body.url);
          await addReferencesToNotion(pageId, parsePapers(referencesResponse));
        }
      } catch (e: any) {
        setError(e);
      }
    }

    updateUrl();
  }, [body]);

  useEffect(() => {
    async function getArticle() {
      try {
        const articleMetadata: ArticleMetadata = await client.getArticle(debouncedText);
        setArticleMetadata(articleMetadata);
      } catch (e: any) {
        setError(e);
      }
    }

    getArticle();
  }, [debouncedText]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const onPush = async () => {
    if (!articleMetadata) return;

    const notionResponse = await createArticleNotionPage(articleMetadata);
    setPageId(notionResponse.id);

    const readerRequestbody: ReaderRequestBody = {
      category: "pdf",
      url: articleMetadata.pdf.replace(/^http:/, "https:"), // Replace only the "http:" part of the URL with "https:"
      tags: [...articleMetadata.categoryNames],
      title: articleMetadata.title,
      summary: articleMetadata.summary,
      author: articleMetadata.authors[0],
      published_at: articleMetadata.date,
    };

    // Add the journal to tags if it is not "None"
    if (articleMetadata.journal !== "None") {
      readerRequestbody.tags.push(articleMetadata.journal);
    }

    setBody(readerRequestbody);
  };

  return (
    <List
      navigationTitle="Search Tasks"
      searchBarPlaceholder="Search your task"
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      <ArticleItem articleMetadata={articleMetadata} onPush={onPush} />
    </List>
  );
}
