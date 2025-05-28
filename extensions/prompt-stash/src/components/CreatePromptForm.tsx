import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Icon,
  useNavigation,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Prompt, PromptFormValues } from "../types";
import { usePrompt } from "../hooks";
import { formConfig, TAGS } from "../config";
import { promptValidations } from "../utils/validations";

export default function CreatePromptForm() {
  const preferences = getPreferenceValues();
  const [isLoading, setIsLoading] = useState(false);
  const [create] = usePrompt();
  const { pop } = useNavigation();
  const [initialContent, setInitialContent] = useState("");

  useEffect(() => {
    const fetchSelectedText = async () => {
      setIsLoading(true);
      try {
        const selectedText = await getSelectedText();
        if (selectedText) {
          setInitialContent(selectedText);
        }
      } catch (error) {
        setInitialContent("");
      } finally {
        setIsLoading(false);
      }
    };

    if (preferences.autoInsertSelectedPrompt) {
      fetchSelectedText();
    }
  }, []);

  const { handleSubmit, itemProps, reset, setValue } = useForm<PromptFormValues>({
    initialValues: {
      title: "",
      content: "",
      tags: [],
      isFavorite: false,
    },
    async onSubmit(values) {
      setIsLoading(true);
      try {
        const newPrompt: Prompt = {
          id: new Date().getTime().toString(),
          ...values,
          createdAt: new Date(),
        };
        await create(
          newPrompt,
          () => {
            showToast({
              style: Toast.Style.Success,
              title: "Prompt Created! 🎉",
              message: `"${values.title}" has been saved`,
            });
            reset();
            pop();
          },
          () => {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: "Failed to save prompt",
            });
          },
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    validation: promptValidations,
  });

  useEffect(() => {
    if (initialContent) {
      setValue("content", initialContent);
    }
  }, [initialContent]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Prompt" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Clear Form"
            icon={Icon.Trash}
            onAction={() => reset()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title="Title"
        placeholder="Enter a descriptive title for your prompt"
        autoFocus
      />
      <Form.TextArea
        {...itemProps.content}
        title="Prompt Content"
        placeholder="Enter your prompt here"
        enableMarkdown
      />
      <Form.TagPicker {...itemProps.tags} title="Tags" placeholder="Select existing or type to create new tags">
        {TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} icon={tag.icon} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox {...itemProps.isFavorite} label="Add to Favorites" title="Favorite" />
      <Form.Description title="About" text={formConfig.ABOUT} />
      <Form.Separator />
      <Form.Description title="Tips" text={formConfig.TIPS} />
    </Form>
  );
}
