import { Form, ActionPanel, Action, LaunchProps, ToastStyle, showToast, getPreferenceValues } from "@raycast/api";
import { useCachedState, useForm, FormValidation } from "@raycast/utils";
import { useEffect } from "react";

import { Post, Platform } from "./types";
import { fetchPlatforms, schedulePost } from "./api";

export default function Command(props: LaunchProps<{ draftValues: Post }>) {
  const { draftValues: draftPost } = props;

  const api_key = getPreferenceValues<ExtensionPreferences>().api_key;

  const [allPlatforms, setAllPlatforms] = useCachedState<Platform[]>("platforms", [
    {
      platformId: "loading",
      username: "loading",
      displayName: "Loading...",
      profileImageUrl: "",
    },
  ]);

  const { handleSubmit, itemProps, values } = useForm<Post>({
    initialValues: draftPost || { content: "" },
    async onSubmit(post: Post) {
      try {
        await schedulePost(api_key, post);
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
        if (value.length === 0) {
          return "Content cannot be empty";
        }
        if (
          value.length > 280 &&
          values.platforms &&
          values.platforms.findIndex((v) => v.startsWith("twitter")) != -1
        ) {
          showToast({ title: "Too long for X", message: "280 characters limit", style: ToastStyle.Failure });
        }
        if (
          value.length > 300 &&
          values.platforms &&
          values.platforms.findIndex((v) => v.startsWith("bluesky")) != -1
        ) {
          showToast({ title: "Too long for Bluesky", message: "300 characters limit", style: ToastStyle.Failure });
          return "Too long for Bluesky";
        }
        if (
          value.length > 500 &&
          values.platforms &&
          values.platforms.findIndex((v) => v.startsWith("threads")) != -1
        ) {
          showToast({ title: "Too long for Threads", message: "500 characters limit", style: ToastStyle.Failure });
          return "Too long for Threads";
        }
        return undefined;
      },
    },
  });

  useEffect(() => {
    const getPlatforms = async () => {
      try {
        const platforms = await fetchPlatforms(api_key);
        setAllPlatforms(platforms);
      } catch (error) {
        console.error("Error fetching platforms:", error);
        showToast({ title: "Error", message: error, style: ToastStyle.Failure });
      }
    };

    getPlatforms();
  }, [api_key]);

  return (
    <Form
      enableDrafts
      navigationTitle={`Total characters: ${values.content.length}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Schedule Post" />
        </ActionPanel>
      }
    >
      <Form.Description text="Schedule a post in Publora" />

      <Form.DatePicker
        id="scheduledTime"
        title="Schedule"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.scheduledTime}
      />
      <Form.TagPicker id="platforms" title="Publish to" {...itemProps.platforms}>
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
      <Form.TextArea id="content" title="Post" {...itemProps.content} />
    </Form>
  );
}
