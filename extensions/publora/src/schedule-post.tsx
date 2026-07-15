import { Form, ActionPanel, Action, LaunchProps, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { useCachedState, useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

import { Post, Platform } from "./types";
import { fetchPlatforms, schedulePost } from "./api";
import { validateContent } from "./utils";

export default function Command(props: LaunchProps<{ draftValues: Post }>) {
  const { draftValues: draftPost } = props;

  const { api_key } = getPreferenceValues<ExtensionPreferences>();

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
        await schedulePost(api_key, post);
        reset({ content: "", platforms: [], scheduledTime: undefined });
        showToast({
          title: "Success",
          message: "Your post scheduled successfully",
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
        const platforms = await fetchPlatforms(api_key);
        setAllPlatforms(platforms);
        setCanSubmit(true);
      } catch (error) {
        console.error("Error fetching platforms:", error);
        showToast({
          title: "Error",
          message: "Error fetching platforms, check API key",
          style: Toast.Style.Failure,
        });
        setCanSubmit(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (api_key) {
      getPlatforms();
    }
  }, [api_key]);

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
      <Form.Description text="Schedule a post in Publora" />

      <Form.DatePicker title="Schedule" type={Form.DatePicker.Type.DateTime} {...itemProps.scheduledTime} />
      <Form.TagPicker title="Publish to" {...itemProps.platforms}>
        {allPlatforms.map((platform) => (
          <Form.TagPicker.Item
            key={platform.platformId}
            value={platform.platformId}
            title={platform.platformId.split("-")[0]}
            icon={{ source: platform.profileImageUrl }}
          />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.TextArea title="Post" {...itemProps.content} />
    </Form>
  );
}
