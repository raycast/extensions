import { Action, ActionPanel, Detail } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { format } from "date-fns";
import { BaseUrl, buildHeaders, ExportDocResponse } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { cleanMarkdown } from "../utils/formatting";

export function DocDetail({ docId }: { docId: string }) {
  const { token } = useAuth();
  const docUrl = `https://dovetail.com/docs/${docId}`;

  const { data: markdown, isLoading } = useFetch(BaseUrl + `/v1/docs/${docId}/export/markdown`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      const data = ExportDocResponse.parse(json.data);
      const created = format(new Date(data.created_at), "dd MMM yyyy");
      const content = cleanMarkdown(data.content_markdown || "");
      return `# ${data.title}\n\n**Created on ${created}**\n\n${content}`;
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load doc" });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Doc Details"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={docUrl} title="Open in Dovetail" />
          <Action.CopyToClipboard
            title="Copy Link"
            content={docUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
