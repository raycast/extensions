import { Action, ActionPanel, Detail, getSelectedFinderItems } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "node:path";
import { friendlyError, pdfsOnly, SITE_URL, verifyMarkdown } from "./lib/logic";
import { client } from "./lib/raycast";

/** The report for the PDF selected in Finder, as Markdown. Never throws. */
async function checkSelected(): Promise<string> {
  try {
    const items = await getSelectedFinderItems().catch(() => []);
    const pdf = pdfsOnly(items.map((i) => i.path))[0];
    if (!pdf) return "Select a PDF in Finder, then run Verify PDF Signature again.";
    const report = await client().verify(pdf);
    return verifyMarkdown(path.basename(pdf), report);
  } catch (err) {
    const f = friendlyError(err);
    return `# ${f.title}\n\n${f.message}`;
  }
}

export default function Command() {
  const { data: markdown, isLoading } = usePromise(checkSelected);
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown ?? "Checking the signatures with KovaPDF..."}
      actions={
        <ActionPanel>
          {markdown ? <Action.CopyToClipboard title="Copy Report" content={markdown} /> : null}
          <Action.OpenInBrowser title="Open KovaPDF" url={SITE_URL} />
        </ActionPanel>
      }
    />
  );
}
