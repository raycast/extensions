import { Action, ActionPanel, Detail, Form, Toast, showToast } from "@raycast/api";
import { execFile } from "child_process";
import { useState } from "react";

function normalizeUrl(u: string) {
  const t = u.trim();
  return t.startsWith("http") ? t : `https://${t}`;
}

export default function Command() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function run(values: { url: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "designlang: scoring..." });
    execFile(
      "npx",
      ["-y", "designlang", "score", normalizeUrl(values.url)],
      { maxBuffer: 20 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          toast.style = Toast.Style.Failure;
          toast.title = "Scoring failed";
          toast.message = (stderr || err.message).slice(0, 200);
          return;
        }
        toast.style = Toast.Style.Success;
        toast.title = "Scored";
        // Strip ANSI control codes
        setResult("```\n" + stdout.replace(/\u001b\[[0-9;]*m/g, "") + "\n```");
      }
    );
  }

  if (result) {
    return <Detail markdown={result} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Score Design" onSubmit={run} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://linear.app" value={url} onChange={setUrl} />
    </Form>
  );
}
