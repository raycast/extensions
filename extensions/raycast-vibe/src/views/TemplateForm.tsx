import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { PromptTemplate } from "../agents";
import { newCustomId, upsertTemplate } from "../templates";

type Values = { title: string; prompt: string };

export function TemplateForm({
  template,
  onSaved,
}: {
  template?: PromptTemplate;
  onSaved: (list: PromptTemplate[]) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={template ? "Save Template" : "Create Template"}
            onSubmit={async (values: Values) => {
              const title = values.title.trim();
              const prompt = values.prompt.trim();
              if (!title || !prompt) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Title and prompt are required",
                });
                return;
              }
              const next: PromptTemplate = {
                id: template?.id ?? newCustomId(),
                title,
                prompt,
              };
              const list = await upsertTemplate(next);
              onSaved(list);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={template?.title ?? ""}
        placeholder="Short label shown in the list"
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        defaultValue={template?.prompt ?? ""}
        placeholder="The prompt sent to the agent when this template is launched"
      />
    </Form>
  );
}
