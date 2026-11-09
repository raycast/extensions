import { Form, ActionPanel, Action, LaunchProps, Toast, showToast } from "@raycast/api";
import {
  getAccessToken,
  useCachedState,
  useForm,
  FormValidation,
  showFailureToast,
  withAccessToken,
} from "@raycast/utils";
import { useEffect, useState } from "react";

import { Post, Platform } from "./types";
import { fetchPlatforms, schedulePost } from "./api";
import { publora } from "./oauth";
import { accountTitle, validateContent } from "./utils";

function Command(props: LaunchProps<{ draftValues: Post }>) {
  const { draftValues: draftPost } = props;

  const { token } = getAccessToken();

  const [isLoading, setIsLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [allPlatforms, setAllPlatforms] = useCachedState<Platform[]>("platforms", [
    {
      platformId: "loading",
      username: "loading",
      displayName: "Loading...",
      profileImageUrl: "",
    },
  ]);

  const { handleSubmit, itemProps, values, reset } = useForm<Post>({
    initialValues: draftPost || { content: "" },
    async onSubmit(post: Post) {
      if (!canSubmit) {
        showToast({ title: "Error", message: "Please fetch platforms first", style: Toast.Style.Failure });
        return;
      }

      try {
        await schedulePost(token, post);
        reset({ content: "", platforms: [], scheduledTime: undefined });
        showToast({
          title: "Success",
          message: post.scheduledTime ? "Your post scheduled successfully" : "Your post saved as a draft",
          style: Toast.Style.Success,
        });
        return true;
      } catch (error) {
        console.error("Error scheduling post:", error);
        await showFailureToast(error, {
          title: "Failed to schedule post",
        });
      }
    },
    validation: {
      platforms: FormValidation.Required,
      content: (value: string | undefined): string | undefined => validateContent(value, values?.platforms),
    },
  });

  useEffect(() => {
    const getPlatforms = async () => {
      setIsLoading(true);
      try {
        const platforms = await fetchPlatforms(token);
        setAllPlatforms(platforms);
        setCanSubmit(true);
      } catch (error) {
        console.error("Error fetching platforms:", error);
        showToast({
          title: "Error",
          message: "Error fetching accounts, check your connection to Publora",
          style: Toast.Style.Failure,
        });
        setCanSubmit(false);
      } finally {
        setIsLoading(false);
      }
    };

    getPlatforms();
  }, [token]);

  return (
    <Form
      enableDrafts
      navigationTitle={`Total characters: ${values.content.length}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Schedule Post" />
        </ActionPanel>
      }
    >
      <Form.Description text="Leave Schedule empty to save a draft in Publora" />

      <Form.DatePicker title="Schedule" type={Form.DatePicker.Type.DateTime} {...itemProps.scheduledTime} />
      <Form.TagPicker title="Publish to" {...itemProps.platforms}>
        {allPlatforms.map((platform) => (
          <Form.TagPicker.Item
            key={platform.platformId}
            value={platform.platformId}
            title={accountTitle(platform)}
            icon={{ source: platform.profileImageUrl }}
          />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.TextArea title="Post" {...itemProps.content} />
    </Form>
  );
}

export default withAccessToken(publora)(Command);
