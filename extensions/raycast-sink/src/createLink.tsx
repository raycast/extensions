import React, { useState } from "react";
import { URL } from "url";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useTranslation } from "./hooks/useTranslation";
import { createLink } from "./utils/api";
import { LinkDetail } from "./components/LinkDetail";
import { CreateLinkResponse } from "./types";
import { useLinks } from "./hooks/useLinks";

const validUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export default function CreateLinkView() {
  const [urlError, setUrlError] = useState<string | undefined>();
  const [slugError, setSlugError] = useState<string | undefined>();
  const { t } = useTranslation();
  const { push } = useNavigation();
  const { refreshLinks } = useLinks();

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
      const newLink = (await createLink(values.url, values.slug, values.comment)) as CreateLinkResponse;
      await showToast({
        style: Toast.Style.Success,
        title: t.linkCreated,
        message: newLink?.link?.slug || values.slug,
      });

      if (newLink && newLink.link) {
        push(<LinkDetail link={newLink.link} onRefresh={refreshLinks} />);
      }
      refreshLinks();
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
