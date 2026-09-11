import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { osRequest, type HttpMethod } from "../lib/client";
import type { Connection } from "../lib/connections";
import { prettyJson, rawJson, toCurl, toDevToolsConsole } from "../lib/format";
import { addHistory } from "../lib/history";

interface ResultViewProps {
  connection: Connection;
  method: HttpMethod;
  path: string;
  body?: string;
}

export function ResultView({ connection, method, path, body }: ResultViewProps) {
  const [raw, setRaw] = useState(false);

  const { data, isLoading } = usePromise(
    async () => {
      const response = await osRequest(connection, method, path, body);
      await addHistory({
        connectionId: connection.id,
        connectionName: connection.name,
        method,
        path,
        body,
        status: response.status,
      });
      return response;
    },
    [],
    {
      onError: (error) => {
        showFailureToast(error, { title: "Request failed" });
      },
    },
  );

  const statusColor = !data ? Color.SecondaryText : data.ok ? Color.Green : Color.Red;
  const rendered = data ? (raw ? rawJson(data.data) : prettyJson(data.data)) : "";
  const markdown = data ? "```json\n" + rendered + "\n```" : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${method} ${path}`}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={String(data.status)} color={statusColor} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Duration" text={`${data.durationMs} ms`} />
            <Detail.Metadata.Label title="Connection" text={connection.name} />
            <Detail.Metadata.Label title="Request" text={`${method} ${path}`} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={raw ? "Show Pretty JSON" : "Show Raw JSON"}
            icon={Icon.Code}
            onAction={() => setRaw((value) => !value)}
          />
          {data && (
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard
                title="Copy Pretty JSON"
                content={prettyJson(data.data)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard
                title="Copy Raw JSON"
                content={rawJson(data.data)}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
              <Action.CopyToClipboard title="Copy as Curl" content={toCurl(connection, method, path, body)} />
              <Action.CopyToClipboard
                title="Copy as Dev Tools Console"
                content={toDevToolsConsole(method, path, body)}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
