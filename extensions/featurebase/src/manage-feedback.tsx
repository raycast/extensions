import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { buildFeaturebaseUrl, featurebase } from "./featurebase";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { CreateCommentRequest, CreatePostRequest, Post } from "./types";
import TurndownService from "turndown";

export default function ManageFeedback() {
  const {
    isLoading,
    data: posts,
    pagination,
    mutate,
  } = useCachedPromise(
    () => async (options) => {
      const result = await featurebase.posts.list({ page: options.page + 1 });
      return {
        data: result.results,
        hasMore: result.totalResults > result.page * result.limit,
      };
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !posts.length ? (
        <List.EmptyView
          title="Start by creating a post"
          description="Here you can keep track of all the posts made to your feedback board."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.PlusCircle} title="Create First Post" target={<NewPost />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        posts.map((post) => (
          <List.Item
            key={post.id}
            title={post.title}
            subtitle={new Date(post.date).toDateString()}
            accessories={[
              post.commentCount ? { icon: Icon.SpeechBubble, text: post.commentCount.toString() } : {},
              { tag: post.postCategory.category },
              { tag: { value: post.postStatus.name, color: post.postStatus.color } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.SpeechBubble}
                  title="View Comments"
                  target={<ViewComments post={post} />}
                  onPop={mutate}
                />
                <Action.OpenInBrowser url={buildFeaturebaseUrl(`p/${post.slug}`)} />
                <Action.Push
                  icon={Icon.PlusCircle}
                  title="Create Post"
                  target={<NewPost />}
                  onPop={mutate}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Post"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Warning, tintColor: Color.Red },
                      title: "Delete Post",
                      message: "Are you sure you want to delete this post? This can not be undone.",
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", post.title);
                          try {
                            await mutate(featurebase.posts.delete({ id: post.id }), {
                              optimisticUpdate(data) {
                                return data.filter((p) => p.id !== post.id);
                              },
                              shouldRevalidateAfter: false,
                            });
                            toast.style = Toast.Style.Success;
                            toast.title = "Deleted";
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NewPost() {
  const { pop } = useNavigation();
  const { isLoading, data: boards } = useCachedPromise(
    async () => {
      const result = await featurebase.boards.list();
      return result.results;
    },
    [],
    { initialData: [] },
  );
  const { handleSubmit, itemProps } = useForm<CreatePostRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.title);
      try {
        const result = await featurebase.posts.create(values);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = result.submission.title;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      category: FormValidation.Required,
      title: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Submit Post" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Board" {...itemProps.category}>
        {boards.map((board) => (
          <Form.Dropdown.Item key={board.id} title={board.category} value={board.category} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Title" placeholder="Title of your post" {...itemProps.title} />
      <Form.TextArea title="Description" placeholder="Post description" {...itemProps.content} />
    </Form>
  );
}

const turndownService = new TurndownService();
function ViewComments({ post }: { post: Post }) {
  const {
    isLoading,
    data: comments,
    pagination,
    mutate,
  } = useCachedPromise(
    (submissionId: string) => async (options) => {
      const result = await featurebase.comment.list({ page: options.page + 1, submissionId });
      return {
        data: result.results,
        hasMore: result.totalResults > result.page * result.limit,
      };
    },
    [post.id],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination} isShowingDetail>
      {comments.map((comment) => (
        <List.Item
          key={comment.id}
          icon={{ source: comment.authorPicture, fallback: Icon.SpeechBubble }}
          title={comment.author}
          detail={
            <List.Item.Detail
              markdown={turndownService.turndown(comment.content)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Upvotes"
                    icon={Icon.ChevronUp}
                    text={comment.upvotes.toString()}
                  />
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item text={post.postStatus.name} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Board">
                    <List.Item.Detail.Metadata.TagList.Item text={post.postCategory.category} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Author" icon={comment.authorPicture} text={comment.author} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label icon={Icon.PersonLines} title="" />
                  <List.Item.Detail.Metadata.Label title="Email" text={post.authorEmail} />
                  <List.Item.Detail.Metadata.Label title="User ID" text={comment.authorId} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Trash}
                title="Delete Comment"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Warning, tintColor: Color.Red },
                    title: "Are you sure you want to delete this comment?",
                    message: "This action cannot be undone.",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting");
                        try {
                          await mutate(featurebase.comment.delete({ id: comment.id }), {
                            optimisticUpdate(data) {
                              return data.filter((c) => c.id !== comment.id);
                            },
                            shouldRevalidateAfter: false,
                          });
                          toast.style = Toast.Style.Success;
                          toast.title = "Deleted";
                        } catch (error) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = `${error}`;
                        }
                      },
                    },
                  })
                }
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
              <Action.Push
                icon={Icon.Plus}
                title="New Comment"
                target={<NewComment postId={post.id} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewComment({ postId }: { postId: string }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateCommentRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      try {
        await featurebase.comment.create({ submissionId: postId, content: values.content });
        toast.style = Toast.Style.Success;
        toast.title = "Comment successfully posted!";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Send Now" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" placeholder="Write a comment" {...itemProps.content} />
    </Form>
  );
}
