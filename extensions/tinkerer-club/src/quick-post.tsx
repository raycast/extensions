import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getApiClient } from "./api/preferences";
import { JsonDetail } from "./components/json-detail";
import { errorMessage, isJsonObject } from "./lib/json";
import { toDisplayItems } from "./lib/results";
import { CreateShortPostInput, JsonValue, PostDestination, SaveShortDraftInput } from "./types/api";

interface QuickPostValues {
  content: string;
  destination: PostDestination;
  topicSlugs: string[];
}

interface TopicOption {
  name: string;
  slug: string;
}

function topicOptions(value: JsonValue): TopicOption[] {
  return toDisplayItems(value).flatMap((item) => {
    if (!isJsonObject(item.value)) return [];
    const slug = item.value.slug;
    const name = item.value.name ?? item.value.title;
    return typeof slug === "string" && typeof name === "string" ? [{ name, slug }] : [];
  });
}

export default function QuickPostCommand() {
  const client = useMemo(() => getApiClient(), []);
  const { push } = useNavigation();
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicFailure, setTopicFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTopics() {
      try {
        const result = await client.call({ path: "topic.list", type: "query" }, {}, controller.signal);
        setTopics(topicOptions(result));
      } catch (error) {
        if (!controller.signal.aborted) setTopicFailure(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoadingTopics(false);
      }
    }
    void loadTopics();
    return () => controller.abort();
  }, [client]);

  async function submit(values: QuickPostValues) {
    const content = values.content.trim();
    if (!content) {
      await showToast({ style: Toast.Style.Failure, title: "Post Is Empty" });
      return;
    }
    if (content.length > 50_000) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Post Is Too Long",
        message: "Short posts allow 50,000 characters.",
      });
      return;
    }
    if (values.topicSlugs.length > 6) {
      await showToast({ style: Toast.Style.Failure, title: "Too Many Topics", message: "Choose at most six topics." });
      return;
    }

    const labels: Record<PostDestination, string> = { draft: "Save Draft", now: "Post Now", queue: "Add to Queue" };
    const confirmed = await confirmAlert({
      title: `${labels[values.destination]}?`,
      message: content.length > 240 ? `${content.slice(0, 237)}…` : content,
      primaryAction: { title: labels[values.destination], style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `${labels[values.destination]}…` });
    try {
      const common = { content, images: [], topicSlugs: values.topicSlugs };
      const result =
        values.destination === "draft"
          ? await client.call<SaveShortDraftInput>({ path: "post.saveShortDraft", type: "mutation" }, common)
          : await client.call<CreateShortPostInput>(
              { path: "post.create", type: "mutation" },
              { ...common, publish: values.destination, type: "SHORT" },
            );
      toast.style = Toast.Style.Success;
      toast.title =
        values.destination === "draft" ? "Draft Saved" : values.destination === "queue" ? "Post Queued" : "Posted";
      push(<JsonDetail client={client} title={toast.title} data={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Save Post";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      enableDrafts
      isLoading={isLoading || isLoadingTopics}
      searchBarAccessory={<Form.LinkAccessory target={client.baseUrl} text="Open Club" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review Post" icon={Icon.SpeechBubble} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Tinkerer Club" url={client.baseUrl} icon={Icon.Globe} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Post" placeholder="What are you building, learning, or stuck on?" autoFocus />
      <Form.Dropdown id="destination" title="Destination" defaultValue="now">
        <Form.Dropdown.Item value="now" title="Post Now" icon={Icon.ArrowUp} />
        <Form.Dropdown.Item value="queue" title="Add to Queue" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="draft" title="Save as Draft" icon={Icon.Document} />
      </Form.Dropdown>
      <Form.TagPicker id="topicSlugs" title="Topics">
        {topics.map((topic) => (
          <Form.TagPicker.Item key={topic.slug} value={topic.slug} title={topic.name} />
        ))}
      </Form.TagPicker>
      {topicFailure ? <Form.Description title="Topics" text={`Topics unavailable: ${topicFailure}`} /> : null}
    </Form>
  );
}
