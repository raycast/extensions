import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState } from "react";
import { LinkItem } from "../types";
import { uniqueId } from "../utils";
import { useTranslation } from "../i18n";

interface AddLinkFormProps {
  onSubmit: (link: LinkItem) => void;
}

export function AddLinkForm({ onSubmit }: AddLinkFormProps) {
  const { pop } = useNavigation();
  const [urlError, setUrlError] = useState<string | undefined>();
  const t = useTranslation();

  const handleSubmit = (values: { url: string; description?: string }) => {
    if (!values.url) {
      setUrlError(t.urlError);
      return;
    }
    onSubmit({
      id: uniqueId(),
      title: values.description || "",
      url: values.url,
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.addLink} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="url" title={t.urlLabel} placeholder={t.urlPlaceholder} autoFocus error={urlError} />
      <Form.TextField id="description" title={t.description} placeholder={t.descriptionPlaceholder} />
    </Form>
  );
}
