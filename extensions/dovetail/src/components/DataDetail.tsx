import { Action, ActionPanel, Detail } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { format } from "date-fns";
import { BaseUrl, buildHeaders, ExportDataResponse } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { cleanMarkdown } from "../utils/formatting";

export function DataDetail({ dataId }: { dataId: string }) {
  const { token } = useAuth();
  const dataUrl = `https://dovetail.com/data/${dataId}`;

  const { data: markdown, isLoading } = useFetch(BaseUrl + `/v1/data/${dataId}/export/markdown`, {
    headers: buildHeaders(token),
    parseResponse: async (response) => {
      const json = await response.json();
      const data = ExportDataResponse.parse(json.data);
      const created = format(new Date(data.created_at), "dd MMM yyyy");
      let content = cleanMarkdown(data.content_markdown || "");
      content = content.replace(/^\[?AudioVideo.*\n?/im, "");
      return `# ${data.title}\n\n**Created on ${created}**\n\n${content}`;
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load data entry" });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Data Details"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={dataUrl} title="Open in Dovetail" />
          <Action.CopyToClipboard
            title="Copy Link"
            content={dataUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
