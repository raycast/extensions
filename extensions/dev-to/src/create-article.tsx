import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { Article } from "./types/articles";
import { createArticle } from "./utils/functions";
import { refreshNumber } from "./hooks/hooks";
import useStore from "./utils/state";

export default function CreateArticle({ article }: { article: Article | undefined }) {
  const isEdit = typeof article != "undefined";
  const isDraft = isEdit && article.published === false;

  const { setRefresh } = useStore();
  const { pop } = useNavigation();
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
              if (isEdit) {
                setRefresh(refreshNumber());
                pop();
              }
            }}
          />
          <ActionOpenPreferences command={false} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"title"}
        title={"Title"}
        placeholder={"How to implement..."}
        value={title}
        onChange={(newValue) => {
          setTitle(newValue);
        }}
      />
      <Form.TextArea
        id={"body_markdown"}
        title={"Body"}
        placeholder={"React imports all the components..."}
        value={body}
        onChange={(newValue) => {
          setBody(newValue);
        }}
      />
      <Form.TagPicker id="tag_list" title="Tags" value={tags} onChange={setTags}>
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
