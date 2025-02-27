import { Action, ActionPanel, List, showToast, Toast, Form, Icon, useNavigation } from "@raycast/api";
import { BasecampTodo, BasecampComment } from "../utils/types";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { fetchComments, markComplete, postComment } from "../oauth/auth";
import { htmlToMarkdown } from "../utils/markdown";

interface TodoDetailProps {
  todo: BasecampTodo;
  accountId: string;
  projectId: number;
}

export function TodoComments({ todo, accountId, projectId }: TodoDetailProps) {
  const [comments, setComments] = useState<BasecampComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const { pop } = useNavigation();

  useEffect(() => {
    const loadComments = async () => {
      setIsLoadingComments(true);
      try {
        const fetchedComments = await fetchComments(todo.comments_url);
        fetchedComments.forEach((comment) => {
          console.log("Fetched comment:", {
            content: htmlToMarkdown(comment.content),
          });
        });
        setComments(fetchedComments);
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setIsLoadingComments(false);
      }
    };

    if (todo.comments_count > 0) {
      console.log("Fetching comments for todo:", todo.app_url);
      loadComments();
    }
  }, [todo]);

  const handleAddComment = async (content: string) => {
    try {
      const newComment = await postComment(todo.comments_url, content);
      setComments((prevComments) => [...prevComments, newComment]);
      await showToast(Toast.Style.Success, "Comment added successfully");
      pop();
    } catch (error) {
      console.error("Error posting comment:", error);
      await showToast(Toast.Style.Failure, "Failed to add comment");
    }
  };

  const handleMarkComplete = async (todo: BasecampTodo) => {
    try {
      await markComplete(accountId, projectId, todo.id);
      await showToast(Toast.Style.Success, "Todo marked as complete");
      pop();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to mark todo as complete");
    }
  };

  return (
    <List
      isLoading={isLoadingComments}
      isShowingDetail
      searchBarPlaceholder="Search comments..."
      navigationTitle={`Comments for ${todo.title}`}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Comment"
            target={
              <Form
                actions={
                  <ActionPanel>
                    <Action.SubmitForm title="Add Comment" onSubmit={({ comment }) => handleAddComment(comment)} />
                  </ActionPanel>
                }
              >
                <Form.TextArea id="comment" title="Comment" placeholder="Write your comment..." />
              </Form>
            }
          />
          <Action.OpenInBrowser url={todo.app_url} />
          <Action
            title="Mark Todo Complete"
            onAction={() => handleMarkComplete(todo)}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
        </ActionPanel>
      }
    >
      {comments.map((comment) => (
        <List.Item
          key={comment.id}
          title={`Comment by ${comment.creator.name}`}
          accessories={[{ icon: Icon.Calendar, date: new Date(comment.created_at) }]}
          detail={
            <List.Item.Detail
              markdown={`<img src="${comment.creator.avatar_url}" width="20" height="20" style="vertical-align: middle;"> **${comment.creator.name}**
*${format(new Date(comment.created_at), "PPP 'at' pp")}*

${htmlToMarkdown(comment.content)}
`}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Comment"
                target={
                  <Form
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm title="Add Comment" onSubmit={({ comment }) => handleAddComment(comment)} />
                      </ActionPanel>
                    }
                  >
                    <Form.TextArea id="comment" title="Comment" placeholder="Write your comment..." enableMarkdown />
                  </Form>
                }
              />
              <Action.OpenInBrowser url={todo.app_url} />
              <Action
                title="Mark Todo Complete"
                onAction={() => handleMarkComplete(todo)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView icon={Icon.Message} title="No comments yet" />
    </List>
  );
}
