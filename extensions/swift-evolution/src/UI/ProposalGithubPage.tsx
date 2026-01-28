import { Detail, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchMarkdown } from "../Data/api";

export default function ProposalGithubPage(props: { markdownUrl: string; prUrl: string }) {
  const [state, setState] = useState<{ markdown: string }>({ markdown: "" });

  useEffect(() => {
    async function fetch() {
      const markdown = await fetchMarkdown(props.markdownUrl);
      setState(() => ({
        markdown,
      }));
    }
    fetch();
  }, []);

  return (
    <Detail
      isLoading={state.markdown.length === 0}
      markdown={state.markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.prUrl} />
          <Action.CopyToClipboard title="Copy URL" content={props.prUrl} />
        </ActionPanel>
      }
    />
  );
}
