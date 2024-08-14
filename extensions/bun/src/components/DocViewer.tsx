import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

import { NodeHtmlMarkdown } from "node-html-markdown";

export interface DocViewerProps {
  url: string;

  /**
   * @default "markdown"
   */
  type?: "markdown" | "html";

  fetchOptions?: Parameters<typeof useFetch<string>>[1];
  errorOptions?: Parameters<typeof showFailureToast>[1];

  /**
   * If true, renders a `<List.Item.Detail />` instead of
   * a `<Detail />` component.
   */
  listDetail?: boolean;
}

export default function DocViewer(props: DocViewerProps) {
  const doc = useFetch(props.url, props.fetchOptions);

  if (doc.error) {
    showFailureToast(doc.error, props.errorOptions);
  }

  const Component = props.listDetail ? List.Item.Detail : Detail;

  return (
    <Component
      isLoading={doc.isLoading}
      markdown={props.type == "html" && doc.data ? NodeHtmlMarkdown.translate(doc.data) : doc.data}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.url} />
        </ActionPanel>
      }
    />
  );
}
