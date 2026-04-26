import {
  Action,
  ActionPanel,
  Form,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { useState } from "react";

type Prefs = { outputDir?: string };

function resolveOutputDir(raw?: string) {
  const v = (raw || "~/designlang-output").trim();
  return v.startsWith("~") ? v.replace(/^~/, homedir()) : v;
}

function normalizeUrl(u: string) {
  const t = u.trim();
  return t.startsWith("http") ? t : `https://${t}`;
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const [url, setUrl] = useState("");
  const [full, setFull] = useState(false);

  async function run(values: { url: string; full: boolean }) {
    const outDir = resolveOutputDir(prefs.outputDir);
    const args = [
      "-y",
      "designlang",
      normalizeUrl(values.url),
      "--out",
      outDir,
    ];
    if (values.full) args.push("--full");

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "designlang: extracting...",
    });

    execFile("npx", args, { maxBuffer: 50 * 1024 * 1024 }, async (err, stdout, stderr) => {
      if (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Extraction failed";
        toast.message = (stderr || err.message).slice(0, 200);
        return;
      }
      toast.style = Toast.Style.Success;
      toast.title = "Done";
      toast.message = outDir;
      toast.primaryAction = { title: "Open folder", onAction: () => open(outDir) };
      await open(outDir);
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Extract Design" onSubmit={run} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://stripe.com"
        value={url}
        onChange={setUrl}
      />
      <Form.Checkbox id="full" label="Full extraction (screenshots + responsive + interactions)" value={full} onChange={setFull} />
      <Form.Description text="Runs `npx designlang <url>` and opens the output folder when it finishes." />
    </Form>
  );
}
