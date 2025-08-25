import { Form, ActionPanel, Action, LaunchProps, showToast, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect } from "react";

import { Post, Platform } from "./types";
import { fetchPlatforms, schedulePost } from "./api";

export default function Command(props: LaunchProps<{ draftValues: Post }>) {
  async function handleSubmit(post: Post) {
    try {
      await schedulePost(api_key, post);
      showToast({ title: "Submitted form", message: "Your post scheduled successfully" });
      setContent("");
      setDue(null);
      setPlatforms([]);
    } catch (error) {
      console.error("Error scheduling post:", error);
      showToast({ title: "Error", message: "Failed to schedule post" });
    }
  }

  const api_key = getPreferenceValues<ExtensionPreferences>().api_key;

  const [allPlatforms, setAllPlatforms] = useCachedState<Platform[]>("platforms", [
    {
      platformId: "loading",
      username: "loading",
      displayName: "Loading...",
      profileImageUrl: "",
    },
  ]);

  const { draftValues: draftPost } = props;
  const [content, setContent] = useState<string>(draftPost?.content || "");
  const [due, setDue] = useState<Date | null>(draftPost?.scheduledTime || null);
  const [platforms, setPlatforms] = useState<string[]>(draftPost?.platforms || []);

  useEffect(() => {
    const getPlatforms = async () => {
      try {
        const platforms = await fetchPlatforms(api_key);
        setAllPlatforms(platforms);
      } catch (error) {
        console.error("Error fetching platforms:", error);
        showToast({ title: "Error", message: "Failed to fetch platforms" });
      }
    };

    getPlatforms();
  }, [api_key]);

  const updateContent = (content: string) => {
    setContent(content);
  };

  return (
    <Form
      enableDrafts
      navigationTitle={`Total characters: ${content.length}`}
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
        value={due}
        onChange={setDue}
      />
      <Form.TagPicker id="platforms" title="Publish to" value={platforms} onChange={setPlatforms}>
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
      <Form.TextArea id="content" title="Post" value={content} onChange={updateContent} />
    </Form>
  );
}
