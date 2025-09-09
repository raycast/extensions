import {
  Form,
  ActionPanel,
  Action,
  popToRoot,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { randomUUID } from "crypto";
import type { CannedReply } from "./index";

type TemplateFormProps = {
  existing?: CannedReply;
  duplicate?: boolean;
};

export default function TemplateForm(props: TemplateFormProps) {
  const { value: replies, setValue: setReplies } = useLocalStorage<
    CannedReply[]
  >("canned-replies", []);
  const isEdit = Boolean(props.existing && !props.duplicate);
  const [title, setTitle] = useState<string>(
    props.existing
      ? props.existing.title + (props.duplicate ? " (Copy)" : "")
      : "",
  );
  const [body, setBody] = useState<string>(
    props.existing ? props.existing.body : "",
  );

  async function handleSubmit(values: { title: string; body: string }) {
    const titleText = values.title.trim();
    if (titleText.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title cannot be empty",
      });
      return false;
    }
    if (isEdit && props.existing) {
      const updatedList = (replies || []).map((item) =>
        item.id === props.existing!.id
          ? {
              ...item,
              title: titleText,
              body: values.body,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
      await setReplies(updatedList);
      await showToast({
        style: Toast.Style.Success,
        title: "Template Updated",
      });
    } else {
      const newTemplate: CannedReply = {
        id: randomUUID(),
        title: titleText,
        body: values.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setReplies([...(replies || []), newTemplate]);
      await showToast({
        style: Toast.Style.Success,
        title: props.duplicate ? "Template Duplicated" : "Template Created",
      });
    }
    popToRoot();
  }

  return (
    <Form
      navigationTitle={isEdit ? "Edit Canned Reply" : "Canned Reply"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Changes" : "Save Template"}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser
            title="Open Documentation"
            icon={Icon.Globe}
            url="https://github.com/Enragedsaturday/raycast-canned-email-response#readme"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Template title"
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextArea
        id="body"
        title="Body"
        placeholder="Email reply text..."
        value={body}
        onChange={setBody}
      />
    </Form>
  );
}
