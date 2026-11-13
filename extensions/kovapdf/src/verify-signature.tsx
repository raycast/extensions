import { Action, ActionPanel, Detail, getSelectedFinderItems } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "node:path";
import { friendlyError, pdfsOnly, SITE_URL, verifyMarkdown } from "./lib/logic";
import { client } from "./lib/raycast";

export default function Command() {
  const [markdown, setMarkdown] = useState<string>();
  useEffect(() => {
    (async () => {
      try {
        const items = await getSelectedFinderItems().catch(() => []);
        const pdf = pdfsOnly(items.map((i) => i.path))[0];
        if (!pdf) {
          setMarkdown("Select a PDF in Finder, then run Verify PDF Signature again.");
          return;
        }
        const report = await client().verify(pdf);
        setMarkdown(verifyMarkdown(path.basename(pdf), report));
      } catch (err) {
        const f = friendlyError(err);
        setMarkdown(`# ${f.title}\n\n${f.message}`);
      }
    })();
  }, []);
  return (
    <Detail
      isLoading={markdown === undefined}
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
