import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { createText, getTextDomains } from "./lib/api";
import { getDefaultTextDomain } from "./lib/sdk";
import { addHistoryItem } from "./lib/history";

function CreateTextShareCommand() {
  const [titleError, setTitleError] = useState<string | undefined>();
  const [domain, setDomain] = useState("");

  const { data: domains, isLoading: domainsLoading } = usePromise(
    async () => (await getTextDomains()).data.domains,
  );

  useEffect(() => {
    if (!domains) return;
    getDefaultTextDomain().then((d) => {
      if (d && domains.includes(d)) setDomain(d);
      else if (domains.length > 0) setDomain(domains[0]);
    });
  }, [domains]);

  async function handleSubmit(values: {
    content: string;
    title: string;
    custom_slug: string;
    password: string;
    text_type: string;
    expire_at: Date | null;
  }) {
    if (!values.title.trim()) {
      setTitleError("Title is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating text share...",
    });
    try {
      const res = await createText({
        content: values.content,
        title: values.title,
        domain: domain || undefined,
        custom_slug: values.custom_slug || undefined,
        password: values.password || undefined,
        text_type:
          (values.text_type as "plain_text" | "source_code" | "markdown") ||
          undefined,
        expire_at: values.expire_at
          ? Math.floor(values.expire_at.getTime() / 1000)
          : undefined,
      });

      await Clipboard.copy(res.data.short_url);
      await addHistoryItem({
        type: "text",
        title: values.title,
        url: res.data.short_url,
        domain: domain || new URL(res.data.short_url).hostname,
        slug: res.data.slug,
        createdAt: new Date().toISOString(),
      });

      toast.style = Toast.Style.Success;
      toast.title = "Text share created";
      toast.message = `${res.data.short_url} copied to clipboard`;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create text share";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={domainsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Text Share"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter a title"
        error={titleError}
        onChange={() => titleError && setTitleError(undefined)}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter text to share..."
      />
      <Form.Dropdown
        id="domain"
        title="Domain"
        value={domain}
        onChange={setDomain}
      >
        {domains?.map((d) => (
          <Form.Dropdown.Item key={d} value={d} title={d} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="text_type" title="Text Type" defaultValue="plain_text">
        <Form.Dropdown.Item value="plain_text" title="Plain Text" />
        <Form.Dropdown.Item value="source_code" title="Source Code" />
        <Form.Dropdown.Item value="markdown" title="Markdown" />
      </Form.Dropdown>
      <Form.TextField
        id="custom_slug"
        title="Custom Slug"
        placeholder="Optional"
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Optional"
      />
      <Form.DatePicker id="expire_at" title="Expire At" />
    </Form>
  );
}

export default function CreateTextShare() {
  return <CreateTextShareCommand />;
}
