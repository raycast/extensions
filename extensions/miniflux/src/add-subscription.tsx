import { Form, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useState, useCallback } from "react";
import { DiscoveredFeed, MinifluxApiError } from "./utils/types";
import { useErrorHandler } from "./utils/useErrorHandler";
import { useCategories } from "./utils/useCategories";
import apiServer from "./utils/api";
import CreateFeedForm from "./components/CreateFeedForm";

type FromType = {
  url: string;
  category_id: string;
};

export default function AddSubscription() {
  const categories = useCategories();
  const handleError = useErrorHandler();

  const [feeds, setFeeds] = useState<DiscoveredFeed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");

  const discoverFeeds = useCallback(
    async ({ url, category_id }: FromType) => {
      if (urlError) return;
      try {
        setIsLoading(true);
        showToast(Toast.Style.Animated, "Finding feeds...");
        const results = await apiServer.discoverFeed({ url });

        if (results.length === 0) {
          showToast(Toast.Style.Failure, "No feeds found");
        } else {
          showToast(Toast.Style.Success, `${results.length} feeds found`);
          setFeeds(results);
        }

        setIsLoading(false);
        setCategoryId(category_id);
      } catch (error) {
        handleError(error as MinifluxApiError);
        setIsLoading(false);
      }
    },
    [urlError]
  );

  const handleUrl = () => {
    if (url.length > 0) {
      setUrlError(undefined);
    } else {
      setUrlError("The field should not be empty");
    }
  };

  return (
    <>
      {feeds.length !== 0 ? (
        <CreateFeedForm feeds={feeds} categoryId={categoryId} />
      ) : (
        <Form
          isLoading={isLoading}
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Find a Feed" onSubmit={discoverFeeds} />
            </ActionPanel>
          }
        >
          <Form.TextField
            id="url"
            title="URL"
            value={url}
            placeholder="https://domain.tld/"
            error={urlError}
            onChange={setUrl}
            onBlur={handleUrl}
          />
          <Form.Dropdown id="category_id" title="Category" storeValue>
            {categories.map(({ id, title }) => (
              <Form.Dropdown.Item key={id} title={title} value={id.toString()} />
            ))}
          </Form.Dropdown>
        </Form>
      )}
    </>
  );
}
