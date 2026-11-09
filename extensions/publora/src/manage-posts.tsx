import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  FormValidation,
  getAccessToken,
  showFailureToast,
  useCachedPromise,
  useCachedState,
  useForm,
  withAccessToken,
} from "@raycast/utils";

import { deletePost, fetchPlatforms, listPosts, updatePost } from "./api";
import { publora } from "./oauth";
import { Post, PostStatus, PublishedPost } from "./types";
import { accountTitle, networkName, validateContent } from "./utils";

const STATUS_COLORS: Record<PostStatus, Color> = {
  draft: Color.SecondaryText,
  scheduled: Color.Blue,
  published: Color.Green,
  partially_published: Color.Orange,
  failed: Color.Red,
};

const statusLabel = (status: PostStatus) => status.replace("_", " ");

function EditPost({ post, onSaved }: { post: PublishedPost; onSaved: () => void }) {
  const { token } = getAccessToken();
  const { pop } = useNavigation();
  const { data: platforms = [], isLoading } = useCachedPromise(fetchPlatforms, [token]);

  const { handleSubmit, itemProps, values } = useForm<Post>({
    initialValues: {
      content: post.content,
      platforms: post.platforms.map((platform) => platform.platformId),
      scheduledTime: post.scheduledTime ? new Date(post.scheduledTime) : null,
    },
    async onSubmit(edited: Post) {
      try {
        await updatePost(token, post.postGroupId, edited);
        await showToast({ title: "Post updated", style: Toast.Style.Success });
        onSaved();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update post" });
      }
    },
    validation: {
      platforms: FormValidation.Required,
      content: (value: string | undefined): string | undefined => validateContent(value, values?.platforms),
    },
  });

  return (
    <Form
      navigationTitle={`Total characters: ${values.content.length}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Post" />
        </ActionPanel>
      }
    >
      <Form.Description text="Leave Schedule empty to keep this post as a draft" />
      <Form.DatePicker title="Schedule" type={Form.DatePicker.Type.DateTime} {...itemProps.scheduledTime} />
      <Form.TagPicker title="Publish to" {...itemProps.platforms}>
        {platforms.map((platform) => (
          <Form.TagPicker.Item
            key={platform.platformId}
            value={platform.platformId}
            title={accountTitle(platform)}
            icon={{ source: platform.profileImageUrl }}
          />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.TextArea title="Post" {...itemProps.content} />
    </Form>
  );
}

function Command() {
  const { token } = getAccessToken();
  const [status, setStatus] = useCachedState<string>("status-filter", "all");

  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (status: string) => async (options: { page: number }) => {
      const { posts, pagination } = await listPosts(token, {
        status: status === "all" ? undefined : (status as PostStatus),
        page: options.page + 1,
      });
      return { data: posts, hasMore: pagination.hasNextPage };
    },
    [status],
  );

  const remove = async (post: PublishedPost) => {
    const confirmed = await confirmAlert({
      title: "Delete this post?",
      message: "It will be removed from Publora for all accounts.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await deletePost(token, post.postGroupId);
      await showToast({ title: "Post deleted", style: Toast.Style.Success });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete post" });
    }
  };

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Status" value={status} onChange={setStatus}>
          <List.Dropdown.Item title="All Posts" value="all" />
          <List.Dropdown.Item title="Drafts" value="draft" />
          <List.Dropdown.Item title="Scheduled" value="scheduled" />
          <List.Dropdown.Item title="Published" value="published" />
          <List.Dropdown.Item title="Failed" value="failed" />
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={Icon.Calendar} title="No posts here yet" />
      {data?.map((post) => (
        <List.Item
          key={post.postGroupId}
          title={post.content.split("\n")[0] || "(no text)"}
          subtitle={post.platforms.map((platform) => networkName(platform.platform)).join(", ")}
          accessories={[
            ...(post.scheduledTime ? [{ date: new Date(post.scheduledTime) }] : []),
            { tag: { value: statusLabel(post.status), color: STATUS_COLORS[post.status] } },
          ]}
          actions={
            <ActionPanel>
              {(post.status === "draft" || post.status === "scheduled") && (
                <Action.Push
                  title="Edit Post"
                  icon={Icon.Pencil}
                  target={<EditPost post={post} onSaved={revalidate} />}
                />
              )}
              <Action.CopyToClipboard title="Copy Text" content={post.content} />
              <Action
                title="Delete Post"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => remove(post)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToken(publora)(Command);
