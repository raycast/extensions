import { Action, ActionPanel, Color, Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getVirtualServerStatus } from "./api";
import { ErrorResponse, GetVirtualServerStatusResponse } from "./types";
import ErrorComponent from "./components/ErrorComponent";
import MetadataDetailComponent from "./components/MetadataDetailComponent";

export default function GetVirtualServerStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse>();
  const [status, setStatus] = useState<GetVirtualServerStatusResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getVirtualServerStatus();
    if (response.status === "success") {
      setStatus(response);
      await showToast(Toast.Style.Success, "SUCCESS", "Fetched Status");
    } else setError(response);
    setIsLoading(false);
  }
  useEffect(() => {
    getFromApi();
  }, []);

  const markdown = !status ? undefined : `## VM Status: ${status.vmstat}`;

  return error ? (
    <ErrorComponent error={error.statusmsg} />
  ) : (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !status ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="VM Status">
              <Detail.Metadata.TagList.Item
                text={status.vmstat}
                color={status.vmstat === "online" ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
            <MetadataDetailComponent metadata={status} />
          </Detail.Metadata>
        )
      }
      actions={
        status && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Status to Clipboard" content={status.vmstat} />
          </ActionPanel>
        )
      }
    />
  );
}
