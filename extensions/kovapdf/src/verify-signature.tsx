import { Action, ActionPanel, Detail, getSelectedFinderItems, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "node:path";
import { friendlyError, pdfsOnly, SITE_URL, verifyMarkdown } from "./lib/logic";
import { client } from "./lib/raycast";

type Check = { markdown: string; ok: boolean };

/** The report for the PDF selected in Finder, as Markdown. Never throws. */
async function checkSelected(): Promise<Check> {
  try {
    const items = await getSelectedFinderItems().catch(() => []);
    const pdf = pdfsOnly(items.map((i) => i.path))[0];
    if (!pdf) return { markdown: "# Select a PDF first\n\nSelect a PDF in Finder, then choose Try Again.", ok: false };
    const report = await client().verify(pdf);
    return { markdown: verifyMarkdown(path.basename(pdf), report), ok: true };
  } catch (err) {
    const f = friendlyError(err);
    return { markdown: `# ${f.title}\n\n${f.message}`, ok: false };
  }
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(checkSelected);
  return (
    <Detail
      isLoading={isLoading}
      markdown={data?.markdown ?? "Checking the signatures with KovaPDF..."}
      actions={
        <ActionPanel>
          {data?.ok ? <Action.CopyToClipboard title="Copy Report" content={data.markdown} /> : null}
          {data ? (
            <Action
              title={data.ok ? "Check Again" : "Try Again"}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          ) : null}
          <Action.OpenInBrowser title="Open KovaPDF" url={SITE_URL} />
        </ActionPanel>
      }
    />
  );
}
