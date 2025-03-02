import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { GeneratePostValues, PostGenerateResponse } from "./types";
import { FormValidation, useForm } from "@raycast/utils";
import { generatePost, getCurrentUser, getPostModels } from "./postowl";

export default function Command() {
  const [postModels, setPostModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [generatedPost, setGeneratedPost] = useState<PostGenerateResponse | null>(null);
  const { handleSubmit, reset, focus, itemProps } = useForm<GeneratePostValues>({
    initialValues: {
      userId: "",
      prompt: "",
      postModelId: "",
    },
    onSubmit: async (values) => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating Post",
      });

      try {
        const draft = await generatePost(values.prompt, userId, values.postModelId);

        setGeneratedPost(draft);

        console.log(draft);

        focus("prompt");

        await showToast({
          style: Toast.Style.Success,
          title: "Generated post",
        });

        reset({
          prompt: "",
          postModelId: "",
          userId: userId,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed creating post",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    validation: {
      prompt: FormValidation.Required,
      postModelId: FormValidation.Required,
    },
  });

  // Fetch user and accounts when component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        const user = await getCurrentUser();
        const userPostModels = await getPostModels();
        setPostModels(userPostModels);
        setUserId(user.id);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load post models",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Post" onSubmit={handleSubmit} />
          {generatedPost && (
            <>
              <Action.SubmitForm title="Copy Post" onSubmit={handleSubmit} />
              <Action.SubmitForm title="Regenerate Post" onSubmit={handleSubmit} />
            </>
          )}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Dropdown title="Post Model" {...itemProps.postModelId}>
        {postModels.map((postModel) => (
          <Form.Dropdown.Item key={postModel.id} value={postModel.id} title={postModel.name || postModel.id} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Prompt" placeholder="Aa.." autoFocus {...itemProps.prompt} />

      {generatedPost && <Form.TextArea title="Generated Post" value={generatedPost.message || ""} id="generatedPost" />}
    </Form>
  );
}
