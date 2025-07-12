import { ActionPanel, Form, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

interface Prompt {
  id: string;
  name: string;
}
interface Organization {
  id: string;
  name: string;
}

export default function Command() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptId, setPromptId] = useState<string | undefined>(undefined);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [context, setContext] = useState<string>("personal");
  const [tags, setTags] = useState<string[]>([]);
  const { "Session Token": sessionToken } = getPreferenceValues();

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const res = await fetch("https://logggai.run/api/prompts", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { prompts?: Prompt[] };
        setPrompts(data.prompts || []);
        if (data.prompts && data.prompts.length > 0) setPromptId(data.prompts[0].id);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch prompts" });
      }
    }
    async function fetchOrgs() {
      try {
        const res = await fetch("https://logggai.run/api/organizations", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        const data = (await res.json()) as { organizations?: Organization[] };
        setOrgs(data.organizations || []);
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch organizations" });
      }
    }
    fetchPrompts();
    fetchOrgs();
  }, [sessionToken]);

  async function handleSubmit(values: {
    title: string;
    content: string;
    promptId?: string;
    context: string;
    tags: string[];
  }) {
    try {
      const orgId = values.context !== "personal" ? values.context : undefined;
      const res = await fetch("https://logggai.run/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: values.title,
          content: values.content,
          promptId: values.promptId,
          organizationId: orgId,
          tags: values.tags,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ style: Toast.Style.Success, title: "Post created!" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to create post" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Post" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextArea id="content" title="Content" value={content} onChange={setContent} />
      <Form.Dropdown id="promptId" title="Prompt" value={promptId} onChange={setPromptId}>
        {prompts.map((prompt) => (
          <Form.Dropdown.Item key={prompt.id} value={prompt.id} title={prompt.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="context" title="Context" value={context} onChange={setContext}>
        <Form.Dropdown.Item value="personal" title="Personal Workspace" />
        {orgs.map((org) => (
          <Form.Dropdown.Item key={org.id} value={org.id} title={org.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
