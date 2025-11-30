import { useEffect, useState } from "react";
import { useStorage } from "./hooks/useStorage";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { TagInput } from "./components/tag-input";
import { fetchPageMetadata } from "./utils/fetch-title";

export default function AddBookmarkView() {
  const { data, addBookmark, isLoading } = useStorage();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function getClipboardURL() {
      try {
        const text = await Clipboard.readText();
        if (text?.startsWith("http")) {
          setUrl(text);
        }
      } catch (error) {
        console.error("Error getting clipboard URL:", error);
      }
    }
    getClipboardURL();
  }, []);

  // Auto-refetch title when URL changes
  useEffect(() => {
    async function autoFetchTitle() {
      if (!url || !url.startsWith("http")) return;

      // Only auto-fetch if title is empty
      if (title) return;

      setIsFetching(true);

      try {
        const metadata = await fetchPageMetadata(url);

        if (metadata?.title) {
          setTitle(metadata.title);

          if (metadata.description) {
            setDescription(metadata.description);
          }

          if (metadata.favicon) {
            setFavicon(metadata.favicon);
          }

          await showToast({
            style: Toast.Style.Success,
            title: "Website information fetched!",
          });
        }
      } catch (error) {
        console.error("Error fetching website information:", error);
      } finally {
        setIsFetching(false);
      }
    }

    // Debounce the fetch
    const timeoutId = setTimeout(autoFetchTitle, 500);
    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleSubmit = async () => {
    if (!url || !title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Please fill in both URL and title",
      });
      return;
    }

    try {
      await addBookmark({ url, title, description, tags, favicon });

      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark saved!",
      });

      // Reset form
      setUrl("");
      setTitle("");
      setDescription("");
      setTags([]);
      setFavicon(null);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save bookmark",
        message: String(error),
      });
    }
  };

  const handleFetchMetadata = async () => {
    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter URL first",
      });
      return;
    }

    setIsFetching(true);
    const metadata = await fetchPageMetadata(url);
    setIsFetching(false);

    if (metadata?.title) {
      setTitle(metadata.title);
      if (metadata.description) {
        setDescription(metadata.description);
      }
      if (metadata.favicon) {
        setFavicon(metadata.favicon);
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch website information",
      });
    }
  };

  const renderActionPanel = () => (
    <ActionPanel>
      <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
      <Action title="Fetch Title Manually" onAction={handleFetchMetadata} shortcut={{ modifiers: ["cmd"], key: "t" }} />
    </ActionPanel>
  );

  return (
    <Form isLoading={isLoading} actions={renderActionPanel()}>
      <Form.TextField id="url" title="URL" placeholder="https://example.com" value={url} onChange={setUrl} />
      <Form.TextField
        id="title"
        title="Title"
        placeholder={isFetching ? "Fetching title..." : "Link title"}
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        value={description}
        onChange={setDescription}
      />

      <TagInput
        id="tags"
        title="Tags"
        value={tags}
        onChange={setTags}
        availableTags={data.tags} // Pass Tag objects now
      />
    </Form>
  );
}
