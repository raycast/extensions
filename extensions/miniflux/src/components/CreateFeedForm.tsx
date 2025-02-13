import AdvanceOptions from "./AdvanceOptions";
import { ActionPanel, Action, Form, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useCallback, useState } from "react";
import { CreateFeedRequest, DiscoveredFeed, MinifluxApiError } from "../utils/types";
import apiServer from "../utils/api";
import { useErrorHandler } from "../utils/useErrorHandler";

type FromType = {
  feeds: DiscoveredFeed[];
  categoryId: string;
};

const CreateFeedForm = ({ feeds, categoryId }: FromType) => {
  const [enableAdvance, setEnableAdvance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleError = useErrorHandler();

  const createFeeds = useCallback(async (values: CreateFeedRequest) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { enableAdvance: _, ...remainingSettings } = values;
    setIsLoading(true);
    try {
      showToast(Toast.Style.Animated, "Subscribing to the feed...");

      await apiServer.createFeed({ ...remainingSettings, category_id: Number(categoryId) });

      setIsLoading(false);
      showToast(Toast.Style.Success, "Subscribed");
    } catch (error) {
      handleError(error as MinifluxApiError);
      setIsLoading(false);
    } finally {
      setTimeout(() => popToRoot(), 3000);
    }
  }, []);

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
};
export default CreateFeedForm;
