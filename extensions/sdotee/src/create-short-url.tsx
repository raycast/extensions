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
import { createShortUrl, getUrlDomains, getTags } from "./lib/api";
import { getDefaultUrlDomain } from "./lib/sdk";
import { addHistoryItem } from "./lib/history";

function CreateShortURLCommand() {
  const [domain, setDomain] = useState("");

  const { data: domains, isLoading: domainsLoading } = usePromise(
    async () => (await getUrlDomains()).data.domains,
  );

  const { data: tags, isLoading: tagsLoading } = usePromise(async () => {
    const res = await getTags();
    return res.data.data.tags;
  });

  useEffect(() => {
    if (!domains) return;
    getDefaultUrlDomain().then((d) => {
      if (d && domains.includes(d)) setDomain(d);
      else if (domains.length > 0) setDomain(domains[0]);
    });
  }, [domains]);

  async function handleSubmit(values: {
    target_url: string;
    custom_slug: string;
    title: string;
    password: string;
    expire_at: Date | null;
    tag_ids: string[];
  }) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating short URL...",
    });
    try {
      const res = await createShortUrl({
        target_url: values.target_url,
        domain,
        custom_slug: values.custom_slug || undefined,
        title: values.title || undefined,
        password: values.password || undefined,
        expire_at: values.expire_at
          ? Math.floor(values.expire_at.getTime() / 1000)
          : undefined,
        tag_ids:
          values.tag_ids.length > 0 ? values.tag_ids.map(Number) : undefined,
      });

      await Clipboard.copy(res.data.short_url);
      await addHistoryItem({
        type: "url",
        title: values.title || values.target_url,
        url: res.data.short_url,
        domain,
        slug: res.data.slug,
        createdAt: new Date().toISOString(),
      });

      toast.style = Toast.Style.Success;
      toast.title = "Short URL created";
      toast.message = `${res.data.short_url} copied to clipboard`;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create short URL";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={domainsLoading || tagsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Short URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target_url"
        title="Target URL"
        placeholder="https://example.com"
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
      <Form.TextField
        id="custom_slug"
        title="Custom Slug"
        placeholder="Optional"
      />
      <Form.TextField id="title" title="Title" placeholder="Optional" />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Optional"
      />
      <Form.DatePicker id="expire_at" title="Expire At" />
      <Form.TagPicker id="tag_ids" title="Tags">
        {tags?.map((tag) => (
          <Form.TagPicker.Item
            key={String(tag.id)}
            value={String(tag.id)}
            title={tag.name}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function CreateShortURL() {
  return <CreateShortURLCommand />;
}
