import { Form, Action, ActionPanel, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useCategories } from "./utils/useCategories";
import { useState, useCallback } from "react";
import { DiscoverRequest, CreateFeedRequest, DiscoveredFeed, MinifluxApiError } from "./utils/types";
import { useErrorHandler } from "./utils/useErrorHandler";
import apiServer from "./utils/api";
import AdvanceOptions from "./components/AdvanceOptions";

export default function AddSubscription() {
  const categories = useCategories();
  const [enableAdvance, setEnableAdvance] = useState(false);
  const [feeds, setFeeds] = useState<DiscoveredFeed[]>();
  const [haveDiscovered, setHaveDiscovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleError = useErrorHandler();

  const discoverFeeds = useCallback(async (url: DiscoverRequest) => {
    setHaveDiscovered(true);
    setIsLoading(true);
    showToast(Toast.Style.Animated, "Finding Feeds...〜(＞＜)〜");

    const results = await apiServer.discoverFeed(url);

    showToast(Toast.Style.Success, `${results.length} feeds have been found ＼(＾▽＾)／`);
    setIsLoading(false);
    setFeeds(results);
  }, []);

  const createFeeds = useCallback(async (values: CreateFeedRequest) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { enableAdvance: _, ...remainingSettings } = values;
    setIsLoading(true);
    try {
      showToast(Toast.Style.Animated, "Subscribing to the feed...__φ(．．;)");

      await apiServer.createFeed({ ...remainingSettings, category_id: values.category_id * 1 });

      setIsLoading(false);
      showToast(Toast.Style.Animated, "Subscribed! ＼(≧▽≦)／");
    } catch (error) {
      handleError(error as MinifluxApiError);
      setIsLoading(false);
    } finally {
      setTimeout(() => popToRoot(), 3000);
    }
  }, []);

  if (haveDiscovered) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Subscribe" onSubmit={createFeeds} />
          </ActionPanel>
        }
      >
        <Form.Dropdown title="Choose a Feed" id="feed_url">
          {feeds?.map(({ url, title, type }) => (
            <Form.Dropdown.Item key={title} value={url} title={`${url} (${type})`} icon={Icon.Livestream} />
          ))}
        </Form.Dropdown>
        <Form.Dropdown id="category_id" title="Category" storeValue>
          {categories.map(({ id, title }) => (
            <Form.Dropdown.Item key={id} title={title} value={id.toString()} />
          ))}
        </Form.Dropdown>
        <Form.Checkbox
          id="enableAdvance"
          label="Enable Advanced Options"
          value={enableAdvance}
          onChange={setEnableAdvance}
          storeValue
        />
        {enableAdvance && <AdvanceOptions />}
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Find a Feed" onSubmit={discoverFeeds} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://domain.tld/" />
    </Form>
  );
}
