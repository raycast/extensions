import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { useChatGo } from "../../hooks/useChatGo";
import { TemplateBaseOps } from "../../type";

type FormValues = TemplateBaseOps;

interface P {
  initValues?: FormValues;
  callback: () => void;
}

export const TemplateForm = ({ initValues, callback }: P) => {
  const { pop } = useNavigation();
  const chatGo = useChatGo();
  const [isLoading, setLoading] = useState(true);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    getTags();
  }, []);

  const getTags = useCallback(() => {
    setLoading(true);
    chatGo
      .getMyTemplateTags()
      .then(({ data }) => {
        setTags(data?.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [chatGo]);

  const { handleSubmit } = useForm<FormValues>({
    onSubmit(values) {
      let fn = null;
      if (initValues?.id) {
        fn = chatGo.updateMyTemplate;
      } else {
        fn = chatGo.createTemplate;
      }
      fn({
        ...initValues,
        ...values,
      })
        .then(() => {
          showToast({
            style: Toast.Style.Success,
            title: initValues ? "Clone to my template success" : "Create template success",
            message: initValues ? "" : `template: ${values.name} has created`,
          }).then(() => {
            callback();
            pop();
          });
        })
        .catch(() => {
          showToast({
            style: Toast.Style.Failure,
            title: initValues ? "Clone to my template fail" : "Create template fail",
          }).then();
        });
    },
    validation: {
      name: FormValidation.Required,
      description: FormValidation.Required,
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Checkmark} onSubmit={handleSubmit}></Action.SubmitForm>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={initValues?.name}
        placeholder="Please input the template name"
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={initValues?.description}
        placeholder="Please input the template description"
      />
      <Form.TextArea
        id="content"
        title="Prompt"
        defaultValue={initValues?.content}
        placeholder="Please input the template prompt"
      />
      <Form.TextArea
        id="sample"
        title="Sample Question"
        defaultValue={initValues?.sample}
        placeholder="Please input the sample question"
      />
      <Form.TagPicker
        id="tags"
        title="Tags"
        defaultValue={initValues?.tags}
        placeholder="Please input the template tags"
      >
        {(tags || []).map((i) => (
          <Form.TagPicker.Item key={i.id.toString()} value={i.name.toString()} title={i.name} />
        ))}
      </Form.TagPicker>
      {!initValues && (
        <>
          <Form.Checkbox
            title="isPub"
            id="is_pub"
            label="Publish your template to the community?"
            defaultValue={false}
          />
          <Form.Description text="publish to community also need some time to review" />
        </>
      )}
    </Form>
  );
};
