import { Action, ActionPanel, Form, open, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { api, APP_URL, solmarrow } from "./api";
import { accountLabel, buildPostBody, validMediaUrl, type PostForm } from "./format";
import { useWorkspace } from "./hooks";

function CreatePost() {
  const { workspaces, workspaceId, setWorkspaceId, isLoading: loadingWorkspaces } = useWorkspace();
  const { data: accounts = [], isLoading: loadingAccounts } = useCachedPromise(
    (id: string) => (id ? api().accounts(id) : Promise.resolve([])),
    [workspaceId],
    {
      onError: (e) => {
        void showFailureToast(e, { title: "Couldn't load your accounts" });
      },
    },
  );
  const [when, setWhen] = useState("draft");
  const [mediaError, setMediaError] = useState<string>();
  const { pop } = useNavigation();

  async function submit(values: PostForm) {
    if (!validMediaUrl(values.mediaUrl)) {
      setMediaError("Use a public https link to the image or video");
      return false;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: when === "schedule" ? "Scheduling post…" : "Saving draft…",
    });
    try {
      const mediaIds: string[] = [];
      const link = values.mediaUrl.trim();
      if (link) {
        toast.message = "Adding the file to your media library…";
        mediaIds.push((await api().mediaFromUrl(workspaceId, link)).media_id);
      }
      const { body, error } = buildPostBody(values, mediaIds);
      if (!body) {
        toast.style = Toast.Style.Failure;
        toast.title = error ?? "Check the form";
        toast.message = undefined;
        return false;
      }
      const post = await api().createPost(workspaceId, body);
      toast.style = Toast.Style.Success;
      toast.title = body.draft ? "Draft saved" : "Post scheduled";
      toast.message = post.scheduled_local ? `${post.scheduled_local} (${post.timezone})` : undefined;
      toast.primaryAction = {
        title: "Open Calendar",
        onAction: () => open(post.calendar_url ?? `${APP_URL}/calendar`),
      };
      pop();
    } catch (e) {
      await showFailureToast(e, { title: "SolMarrow didn't save the post" });
      return false;
    }
  }

  return (
    <Form
      isLoading={loadingWorkspaces || loadingAccounts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={when === "schedule" ? "Schedule Post" : "Save Draft"} onSubmit={submit} />
          <Action.OpenInBrowser title="Open SolMarrow Calendar" url={`${APP_URL}/calendar`} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workspaceId" title="Workspace" value={workspaceId} onChange={setWorkspaceId}>
        {workspaces.map((w) => (
          <Form.Dropdown.Item key={w.id} value={w.id} title={w.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="accountIds" title="Accounts" placeholder="Choose accounts">
        {accounts.map((a) => (
          <Form.TagPicker.Item key={a.id} value={a.id} title={accountLabel(a)} />
        ))}
      </Form.TagPicker>
      <Form.TextArea id="text" title="Text" placeholder="What do you want to post?" enableMarkdown={false} />
      <Form.TextField
        id="mediaUrl"
        title="Image or Video Link"
        placeholder="https://… (optional)"
        info="A public https link straight to a JPG, PNG, WebP, GIF, MP4, MOV or WebM file. SolMarrow downloads it."
        error={mediaError}
        onChange={() => setMediaError(undefined)}
      />
      <Form.Separator />
      <Form.Dropdown id="when" title="When" value={when} onChange={setWhen}>
        <Form.Dropdown.Item value="draft" title="Save as Draft" />
        <Form.Dropdown.Item value="schedule" title="Schedule" />
      </Form.Dropdown>
      {when === "schedule" ? (
        <Form.DatePicker id="publishAt" title="Publish At" info="At least 5 minutes from now" />
      ) : null}
      <Form.Description text="SolMarrow checks the post against each network's rules and tells you if something doesn't fit." />
    </Form>
  );
}

export default withAccessToken(solmarrow)(CreatePost);
