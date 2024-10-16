import React, { useState } from "react";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { Link } from "../types";
import { editLink } from "../utils/api";
import { useTranslation } from "../hooks/useTranslation";
import {} from "../hooks/useConfig";
interface EditLinkViewProps {
  link: Link;
  onEditSuccess: (updatedLink: Link) => void;
}

export function EditLinkView({ link, onEditSuccess }: EditLinkViewProps) {
  const [url, setUrl] = useState(link.url);
  const [comment, setComment] = useState(link.comment || "");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const { t } = useTranslation();

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const updatedLink = await editLink(link.slug, url, comment);
      await showToast({ style: Toast.Style.Success, title: t.linkUpdated });
      onEditSuccess(updatedLink as Link);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.linkUpdateFailed,
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`${t.editLink}:${link.slug}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="url" title={t.url} value={url} onChange={setUrl} placeholder={t.enterUrl} />
      <Form.TextField
        id="comment"
        title={t.comment}
        value={comment}
        onChange={setComment}
        placeholder={t.enterComment}
      />
    </Form>
  );
}
