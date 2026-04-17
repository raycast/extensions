import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, open } from "@raycast/api";
import { useState } from "react";
type Preferences = {
  apiBase: string;
  authorName: string;
};
export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [loading, setLoading] = useState(false);
  async function handle(values: { description: string; author: string; tags: string }) {
    setLoading(true);
    try {
      const res = await fetch(`${prefs.apiBase || "https://www.p2pclaw.com"}/api/paperclaw/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: values.description,
          author: values.author || prefs.authorName,
          tags: values.tags ? values.tags.split(",").map(t => t.trim()) : [],
          client: "raycast",
        }),
      });
      const data: { success: boolean; error?: string; title?: string; url?: string } = await res.json();
      if (!data.success) throw new Error(data.error || "failed");
      await showToast({ style: Toast.Style.Success, title: "Paper published", message: data.title });
      await open(data.url as string);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "PaperClaw failed", message: msg });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Form
      isLoading={loading}
      actions={<ActionPanel><Action.SubmitForm title="Publish" onSubmit={handle} /></ActionPanel>}
    >
      <Form.TextArea id="description" title="Description" placeholder="30-4000 chars describing the project / idea" />
      <Form.TextField id="author" title="Author" defaultValue={prefs.authorName} />
      <Form.TextField id="tags" title="Tags" placeholder="comma,separated" />
    </Form>
  );
}
