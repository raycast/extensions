import { Action, ActionPanel, Form, showToast, Toast, Icon, useNavigation, LocalStorage } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Prompt, PromptFormValues } from "../types";
import { usePrompt } from "../hooks";
import { formConfig, TAGS } from "../config";
import { promptValidations } from "../utils/validations";

export default function EditPromptForm({ promptId }: { promptId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<Prompt | null>(null);
  const [, , update] = usePrompt();
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, reset } = useForm<PromptFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      try {
        if (!initialPrompt) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Initial prompt not found",
          });
          return;
        }
        const updatedPrompt: Prompt = {
          id: initialPrompt.id,
          createdAt: initialPrompt.createdAt,
          ...values,
        };
        await update(
          promptId,
          updatedPrompt,
          () => {
            showToast({
              style: Toast.Style.Success,
              title: "Prompt Updated! 🎉",
              message: `"${values.title}" has been updated successfully`,
            });
            reset();
            pop();
          },
          () => {
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: "Failed to update prompt",
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
    async function loadPrompt() {
      const storedPrompts = await LocalStorage.getItem<string>("prompts");
      if (storedPrompts) {
        const prompts: Prompt[] = JSON.parse(storedPrompts);
        const prompt = prompts.find((p) => p.id === promptId);
        if (prompt) {
          setInitialPrompt(prompt);
          reset({
            title: prompt.title,
            content: prompt.content,
            tags: prompt.tags,
            isFavorite: prompt.isFavorite,
          });
        }
      }
    }
    loadPrompt();
  }, [promptId, reset]);

  if (!initialPrompt) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Prompt" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Reset Form"
            icon={Icon.Trash}
            onAction={() => reset()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Edit the title" autoFocus />
      <Form.TextArea {...itemProps.content} title="Prompt Content" placeholder="Edit the content" enableMarkdown />
      <Form.TagPicker {...itemProps.tags} title="Tags" placeholder="Edit tags">
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
