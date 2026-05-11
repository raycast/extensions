import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { Article } from "./types/articles";
import { createArticle } from "./utils/functions";
import { FormValidation, useForm } from "@raycast/utils";

export default function CreateArticle({ article, onEdit }: { article: Article | undefined; onEdit?: () => void }) {
  const isEdit = typeof article != "undefined";
  const isDraft = isEdit && article.published === false;

  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { itemProps, handleSubmit } = useForm<{
    title: string;
    body_markdown: string;
    tags: string[];
    published: string;
  }>({
    async onSubmit(values) {
      setIsLoading(true);
      const { title, body_markdown, tags } = values;
      const published = values.published === "true" ? true : false;
      isEdit
        ? await createArticle(isEdit, title, published, body_markdown, tags, article.id)
        : await createArticle(isEdit, title, published, body_markdown, tags);

      setIsLoading(false);
      if (isEdit) {
        onEdit?.();
        pop();
      }
    },
    initialValues: {
      title: article?.title,
      body_markdown: article?.body_markdown,
      tags: article?.tag_list ?? ["tutorial"],
      published: String(Boolean(article?.published)),
    },
    validation: {
      title: FormValidation.Required,
      body_markdown: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEdit ? "Edit Article" : "Create Article"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Update Article" : "Create Article"}
            icon={isEdit ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
          <ActionOpenPreferences command={false} />
        </ActionPanel>
      }
    >
      <Form.TextField title={"Title"} placeholder={"How to implement..."} {...itemProps.title} />
      <Form.TextArea title={"Body"} placeholder={"React imports all the components..."} {...itemProps.body_markdown} />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        <Form.TagPicker.Item value="tutorial" title="tutorial" />
        <Form.TagPicker.Item value="react" title="react" />
        <Form.TagPicker.Item value="vue" title="vue" />
        <Form.TagPicker.Item value="svelte" title="svelte" />
        <Form.TagPicker.Item value="beginners" title="beginners" />
        <Form.TagPicker.Item value="node" title="node" />
        <Form.TagPicker.Item value="opensource" title="opensource" />
        <Form.TagPicker.Item value="career" title="career" />
        <Form.TagPicker.Item value="android" title="android" />
        <Form.TagPicker.Item value="testing" title="testing" />
        <Form.TagPicker.Item value="api" title="api" />
        <Form.TagPicker.Item value="security" title="security" />
        <Form.TagPicker.Item value="machinelearning" title="machinelearning" />
        <Form.TagPicker.Item value="cloud" title="cloud" />
        <Form.TagPicker.Item value="nextjs" title="nextjs" />
        <Form.TagPicker.Item value="flutter" title="flutter" />
        <Form.TagPicker.Item value="help" title="help" />
        <Form.TagPicker.Item value="rust" title="rust" />
        <Form.TagPicker.Item value="uxui" title="uxui" />
        <Form.TagPicker.Item value="bash" title="bash" />
        <Form.TagPicker.Item value="development" title="development" />
        <Form.TagPicker.Item value="firebase" title="firebase" />
        <Form.TagPicker.Item value="productivity" title="productivity" />
        <Form.TagPicker.Item value="css" title="css" />
        <Form.TagPicker.Item value="framework" title="framework" />
        <Form.TagPicker.Item value="javascript" title="javascript" />
        <Form.TagPicker.Item value="typescript" title="typescript" />
        <Form.TagPicker.Item value="blockchain" title="blockchain" />
        <Form.TagPicker.Item value="design" title="design" />
        <Form.TagPicker.Item value="database" title="database" />
        <Form.TagPicker.Item value="frontend" title="frontend" />
        <Form.TagPicker.Item value="startup" title="startup" />
        <Form.TagPicker.Item value="vscode" title="vscode" />
        <Form.TagPicker.Item value="web3" title="web3" />
        <Form.TagPicker.Item value="programming" title="programming" />
        <Form.TagPicker.Item value="python" title="python" />
      </Form.TagPicker>

      {(isDraft || !isEdit) && (
        <Form.Dropdown title={"Published"} {...itemProps.published}>
          <Form.Dropdown.Item icon={Icon.EyeDisabled} title={"Draft"} value={"false"} />
          <Form.Dropdown.Item icon={Icon.Eye} title={"Public"} value={"true"} />
        </Form.Dropdown>
      )}
    </Form>
  );
}
