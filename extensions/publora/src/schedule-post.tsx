import { Form, ActionPanel, Action, LaunchProps, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { useCachedState, useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";

import { Post, Platform } from "./types";
import { fetchPlatforms, schedulePost } from "./api";

export default function Command(props: LaunchProps<{ draftValues: Post }>) {
  const { draftValues: draftPost } = props;

  const api_key = getPreferenceValues<ExtensionPreferences>().api_key;

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
        showToast({ title: "Submitted form", message: "Your post scheduled successfully" });
        return true;
      } catch (error) {
        console.error("Error scheduling post:", error);
        showToast({ title: "Error", message: "Failed to schedule post" });
      }
    },
    validation: {
      platforms: FormValidation.Required,
      content: (value) => {
        if (value?.length === 0) {
          return "Content cannot be empty";
        }
        if (value?.length && value?.length > 280 && values?.platforms.findIndex((v) => v.startsWith("twitter")) != -1) {
          showToast({ title: "Too long for X", message: "280 characters limit", style: Toast.Style.Failure });
        }
        if (value?.length && value?.length > 300 && values.platforms.findIndex((v) => v.startsWith("bluesky")) != -1) {
          showToast({ title: "Too long for Bluesky", message: "300 characters limit", style: Toast.Style.Failure });
          return "Too long for Bluesky";
        }
        if (
          value?.length &&
          value?.length > 500 &&
          values.platforms &&
          values.platforms.findIndex((v) => v.startsWith("threads")) != -1
        ) {
          showToast({ title: "Too long for Threads", message: "500 characters limit", style: Toast.Style.Failure });
          return "Too long for Threads";
        }
        return undefined;
      },
    },
  });

  useEffect(() => {
    const getPlatforms = async () => {
      setIsLoading(true);
      try {
        const platforms = await fetchPlatforms(api_key);
        setAllPlatforms(platforms);
        setCanSubmit(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching platforms:", error);
        showToast({ title: "Error", message: "Error fetching platforms, check API key", style: Toast.Style.Failure });
        setCanSubmit(false);
        setIsLoading(false);
      }
    };

    getPlatforms();
  }, []);

  // console.log(allPlatforms);
  // console.log(isLoading);

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
