import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { RootObject } from "./types/articles";
import { createArticle } from "./utils/utils";

export default function CreateArticle({ article }: { article: RootObject | undefined }) {
  const isEdit = typeof article != "undefined";
  const isDraft = isEdit && article.published === false;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(isEdit ? article.title : "");
  const [body, setBody] = useState<string>(isEdit ? article.body_markdown : "");
  const [tags, setTags] = useState<string[]>(isEdit ? article.tag_list : ["tutorial"]);
  const [isPublic, setIsPublic] = useState<boolean>(isEdit ? article.published : false);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEdit ? "Edit Article" : "Create Article"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Update Article" : "Create Article"}
            icon={isEdit ? Icon.Pencil : Icon.Plus}
            onSubmit={async (values) => {
              setIsLoading(true);
              // console.log(values);

              isEdit
                ? await createArticle(isEdit, title, isPublic, body, tags, article.id)
                : await createArticle(isEdit, title, isPublic, body, tags);

              setIsLoading(false);
            }}
          />
          <ActionOpenPreferences command={false} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"title"}
        title={"Title"}
        placeholder={"Article Title..."}
        value={title}
        onChange={(newValue) => {
          setTitle(newValue);
        }}
      />
      <Form.TextArea
        id={"body_markdown"}
        title={"Body"}
        placeholder={"Article Body..."}
        value={body}
        onChange={(newValue) => {
          setBody(newValue);
        }}
      />
      <Form.TagPicker id="tag_list" title="Tags" value={tags} onChange={setTags}>
        <Form.TagPicker.Item value="tutorial" title="tutorial" />
        <Form.TagPicker.Item value="react" title="react" />
        <Form.TagPicker.Item value="productivity" title="productivity" />
        <Form.TagPicker.Item value="css" title="css" />
        <Form.TagPicker.Item value="typescript" title="typescript" />
        <Form.TagPicker.Item value="blockchain" title="blockchain" />
        <Form.TagPicker.Item value="design" title="design" />
        <Form.TagPicker.Item value="database" title="database" />
        <Form.TagPicker.Item value="frontend" title="frontend" />
        <Form.TagPicker.Item value="startup" title="startup" />
        <Form.TagPicker.Item value="vscode" title="vscode" />
        <Form.TagPicker.Item value="web3" title="web3" />
      </Form.TagPicker>

      {(isDraft || !isEdit) && (
        <Form.Dropdown
          id={"published"}
          key={"published"}
          title={"Published"}
          onChange={(newValue) => {
            setIsPublic(newValue == "true");
          }}
        >
          <Form.Dropdown.Item key={"draft"} icon={Icon.EyeDisabled} title={"Draft"} value={"false"} />
          <Form.Dropdown.Item key={"public"} icon={Icon.Eye} title={"Public"} value={"true"} />
        </Form.Dropdown>
      )}
    </Form>
  );
}
