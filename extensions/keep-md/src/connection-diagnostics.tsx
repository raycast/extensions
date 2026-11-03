import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { checkConnection, ConnectionResult } from "./keep";

export function ConnectionDiagnostics() {
  const [results, setResults] = useState<ConnectionResult[]>();

  useEffect(() => {
    checkConnection().then(setResults);
  }, []);

  const lines = results?.map(
    ({ endpoint, status, error }) =>
      `| \`${endpoint}\` | ${status || "Network error"} | ${error || "—"} |`,
  );
  const markdown = [
    "# Keep connection check",
    "This uses the API key stored in this Raycast extension. The key and response contents are not shown.",
    "",
    "| Endpoint | HTTP status | Keep error code |",
    "| --- | --- | --- |",
    ...(lines || []),
    "",
    "A 200 for `/me` and 403 for `/items` means Keep recognizes this key but denies access to saved Items. Keep documents 403 for insufficient credential access or a plan restriction. A 401 means Keep rejects the key.",
  ].join("\n");

  return (
    <Detail
      isLoading={!results}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Edit Keep API Key"
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser
            title="Keep API Key Guide"
            url="https://keep.md/docs/api-keys"
          />
        </ActionPanel>
      }
    />
  );
}
