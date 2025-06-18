import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, showHUD, PopToRootType } from "@raycast/api";

type Values = {
  title: string;
  content: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  async function handlePost(values: Values) {
    if (!values.content || values.content.trim() === "") {
      await showToast({ title: "Error", message: "Content is required", style: Toast.Style.Failure });
      return;
    }

    const token = preferences.apiKey;
    if (!token) {
      await showToast({ title: "Error", message: "API token is required in preferences", style: Toast.Style.Failure });
      return;
    }

    const formBody = new URLSearchParams();
    formBody.append("h", "entry");
    formBody.append("content", values.content);
    if (values.title && values.title.trim() !== "") {
      formBody.append("name", values.title);
    }

    try {
      const response = await fetch("https://micro.blog/micropub", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      });

      if (response.ok) {
        await showHUD("Post published to Micro.blog", { popToRootType: PopToRootType.Immediate });
      } else {
        const errorText = await response.text();
        await showToast({
          title: "Failed to post",
          message: `${response.status} ${response.statusText}: ${errorText}`,
          style: Toast.Style.Failure,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({ title: "Error", message: message ?? "Unknown error", style: Toast.Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handlePost} />
        </ActionPanel>
      }
    >
      <Form.Description text="Post to Microblog" />
      <Form.TextField id="title" title="Title" placeholder="Optional" />
      <Form.TextArea id="content" title="Content" placeholder="Craft your post" autoFocus={true} />
    </Form>
  );
}
