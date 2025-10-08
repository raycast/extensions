import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { format, getISOWeek, startOfMonth, subDays } from "date-fns";
import { FormValidation, showFailureToast, useFetch, useForm } from "@raycast/utils";
import { buildPostizUrl, parsePostizResponse, POSTIZ_HEADERS, STATE_COLORS } from "./postiz";
import { Identifier, Integration, Post } from "./types";

const { postiz_version } = getPreferenceValues<Preferences>();

const generateMarkdown = (post: Post) => {
  switch (post.integration.providerIdentifier) {
    case Identifier.X:
      return post.content
        .replace(/@(\w+)/g, (match, handle) => {
          return `[${match}](https://x.com/${handle})`;
        })
        .replace(/#(\w+)/g, (match, hashtag) => {
          return `[${match}](https://x.com/hashtag/${hashtag})`;
        });
    default:
      return post.content;
  }
};

export default function SearchPosts() {
  type Display = "day" | "week" | "month";
  const [display, setDisplay] = useState<Display>("week");
  const date = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    switch (display) {
      case "day":
        return date;
      case "week":
        return subDays(date, 6);
      case "month":
        return startOfMonth(date);
    }
  }, [date, display]);
  const {
    isLoading,
    data: posts,
    revalidate,
    mutate,
  } = useFetch(
    buildPostizUrl(
      "posts",
      postiz_version === "1"
        ? {
            display: "week",
            day: date.getDay().toString(),
            week: getISOWeek(date).toString(),
            month: (date.getMonth() + 1).toString(),
            year: date.getFullYear().toString(),
          }
        : {
            startDate: startDate.toISOString(),
            endDate: date.toISOString(),
          },
    ),
    {
      headers: POSTIZ_HEADERS,
      parseResponse: parsePostizResponse,
      mapResult(result) {
        return { data: (result as { posts: Post[] }).posts };
      },
      initialData: [],
    },
  );

  const confirmAndDelete = async (postId: string) => {
    const options: Alert.Options = {
      icon: { source: Icon.Warning, tintColor: Color.Red },
      title: "Are you sure?",
      message: "Are you sure you want to delete this post?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Yes, delete it",
      },
      dismissAction: {
        title: "No, cancel!",
      },
    };
    if (!(await confirmAlert(options))) return;
    try {
      await mutate(
        fetch(buildPostizUrl(`posts/${postId}`), {
          method: "DELETE",
          headers: POSTIZ_HEADERS,
        }).then(parsePostizResponse),
        {
          optimisticUpdate(data) {
            return data.filter((p) => p.id !== postId);
          },
          shouldRevalidateAfter: false,
        },
      );
    } catch (error) {
      await showFailureToast(error);
    }
  };
  const subtitle = `${format(postiz_version === "1" ? subDays(date, 6) : startDate, "MM/dd/yyyy")} - ${format(date, "MM/dd/yyyy")}`;
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        postiz_version === "1" ? undefined : (
          <List.Dropdown tooltip="Display" onChange={(d) => setDisplay(d as Display)} defaultValue="week" storeValue>
            <List.Dropdown.Item title="Day" value="day" />
            <List.Dropdown.Item title="Week" value="week" />
            <List.Dropdown.Item title="Month" value="month" />
          </List.Dropdown>
        )
      }
    >
      <List.EmptyView title="No Results" description={subtitle} />
      <List.Section title="Today" subtitle={subtitle}>
        {posts.map((post) => (
          <List.Item
            key={post.id}
            icon={post.integration.picture}
            title={post.id}
            detail={
              <List.Item.Detail
                markdown={generateMarkdown(post)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Provider"
                      icon={`platforms/${post.integration.providerIdentifier}.png`}
                    />
                    <List.Item.Detail.Metadata.TagList title="State">
                      <List.Item.Detail.Metadata.TagList.Item text={post.state} color={STATE_COLORS[post.state]} />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Create Post" target={<CreatePost />} onPop={revalidate} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Post"
                  onAction={() => confirmAndDelete(post.id)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CreatePost() {
  const { pop } = useNavigation();
  const { isLoading, data: channels } = useFetch<Integration[], Integration[]>(buildPostizUrl("integrations"), {
    headers: POSTIZ_HEADERS,
    initialData: [],
  });
  type FormValues = {
    type: string;
    integrationId: string;
    content: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      try {
        const body = {
          type: values.type,
          date: new Date().toISOString(),
          tags: [],
          shortLink: false,
          posts: [
            {
              integration: {
                id: values.integrationId,
              },
              value: [
                {
                  content: values.content,
                },
              ],
            },
          ],
        };
        const response = await fetch(buildPostizUrl("posts"), {
          method: "POST",
          headers: POSTIZ_HEADERS,
          body: JSON.stringify(body),
        });
        await parsePostizResponse(response);
        pop();
      } catch (error) {
        await showFailureToast(error);
      }
    },
    validation: {
      type: FormValidation.Required,
      integrationId: FormValidation.Required,
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="Draft" value="draft" />
      </Form.Dropdown>
      <Form.Dropdown title="Channel" {...itemProps.integrationId}>
        {channels.map((channel) => (
          <Form.Dropdown.Item
            key={channel.id}
            icon={channel.picture}
            title={`${channel.profile} (${channel.identifier})`}
            value={channel.id}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Content" {...itemProps.content} />
    </Form>
  );
}
