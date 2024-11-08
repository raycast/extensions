import React, { useState } from "react";
import { URL } from "url";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useTranslation } from "./hooks/useTranslation";
interface CreateLinkViewProps {
  onSubmit: (url: string, slug: string, comment?: string) => Promise<void>;
}

const validUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export default function CreateLinkView({ onSubmit }: CreateLinkViewProps) {
  const [urlError, setUrlError] = useState<string | undefined>();
  const [slugError, setSlugError] = useState<string | undefined>();
  const { t } = useTranslation();

  async function handleSubmit(values: { url: string; slug: string; comment?: string }) {
    if (!values.url) {
      setUrlError(t.urlRequired);
      return;
    }
    if (!values.slug) {
      setSlugError(t.slugRequired);
      return;
    }

    if (!validUrl(values.url)) {
      setUrlError(t.invalidUrl);
      return;
    }

    try {
      await onSubmit(values.url, values.slug, values.comment);
      await showToast({
        style: Toast.Style.Success,
        title: t.linkCreated,
        message: values.slug,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.linkCreationFailed,
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.createShortLink} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title={t.url}
        placeholder={t.enterUrl}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
      <Form.TextField
        id="slug"
        title={t.slug}
        placeholder={t.enterSlug}
        error={slugError}
        onChange={() => setSlugError(undefined)}
      />
      <Form.TextField id="comment" title={t.comment} placeholder={t.enterComment} />
    </Form>
  );
}
