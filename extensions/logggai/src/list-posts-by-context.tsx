import { List, ActionPanel, Action, getPreferenceValues, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

function EditPostForm({ post, onSave }: { post: Post; onSave: () => void }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const { "Session Token": sessionToken } = getPreferenceValues();
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; content: string }) {
    try {
      const res = await fetch(`https://logggai.run/api/posts/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ title: values.title, content: values.content }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ style: Toast.Style.Success, title: "Post updated!" });
      onSave();
      pop();
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to update post" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextArea id="content" title="Content" value={content} onChange={setContent} />
    </Form>
  );
}

export default function Command() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { "Session Token": sessionToken } = getPreferenceValues();
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchPosts() {
      try {
        const contextRes = await fetch("https://logggai.run/api/user/context", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const contextData = (await contextRes.json()) as { organizationId?: string };
        const orgId = contextData.organizationId;
        const postsUrl = orgId
          ? `https://logggai.run/api/posts?organizationId=${orgId}`
          : "https://logggai.run/api/posts";
        const res = await fetch(postsUrl, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { posts?: Post[] };
        setPosts(data.posts || []);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch posts" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchPosts();
  }, [sessionToken]);

  async function handleArchive(postId: string) {
    try {
      const res = await fetch(`https://logggai.run/api/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: "archive" }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ style: Toast.Style.Success, title: "Post archived!" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      // No action needed if archiving fails silently
    }
  }

  async function handleDelete(postId: string) {
    try {
      const res = await fetch(`https://logggai.run/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ style: Toast.Style.Success, title: "Post deleted!" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      // No action needed if deletion fails silently
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your devlogs...">
      {posts.map((post) => (
        <List.Item
          key={post.id}
          title={post.title}
          subtitle={new Date(post.createdAt).toLocaleString()}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://logggai.run/dashboard`} />
              <Action.CopyToClipboard content={post.content} />
              <Action title="Edit" onAction={() => push(<EditPostForm post={post} onSave={() => {}} />)} />
              <Action title="Archive" onAction={() => handleArchive(post.id)} />
              <Action title="Delete" style={Action.Style.Destructive} onAction={() => handleDelete(post.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
