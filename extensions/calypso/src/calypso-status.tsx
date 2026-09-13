import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Endpoint, endpoints, humanBytes, humanCount, prefs, Props, props } from "./calypso";

interface Row {
  endpoint: Endpoint;
  up: boolean;
  info: Props | null;
}

export default function Command() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = prefs();
      const results = await Promise.all(
        endpoints(p).map(async (endpoint) => {
          const info = await props(endpoint, p);
          return { endpoint, up: info !== null, info };
        }),
      );
      if (!cancelled) {
        setRows(results);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <List isLoading={loading} isShowingDetail>
      {rows.map((row) => (
        <List.Item
          key={row.endpoint.baseUrl}
          title={row.endpoint.label}
          subtitle={row.info?.model ?? row.endpoint.model}
          icon={
            row.up
              ? { source: Icon.CircleFilled, tintColor: Color.Green }
              : { source: Icon.CircleFilled, tintColor: Color.Red }
          }
          accessories={[
            {
              text: row.up
                ? `${row.info?.contextSize ? `${Math.round(row.info.contextSize / 1024)}K ctx` : "up"}`
                : "unreachable",
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Base URL" text={row.endpoint.baseUrl} />
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={row.up ? "healthy" : "unreachable"}
                    icon={{
                      source: Icon.CircleFilled,
                      tintColor: row.up ? Color.Green : Color.Red,
                    }}
                  />
                  <List.Item.Detail.Metadata.Label title="Model" text={row.info?.model ?? "—"} />
                  <List.Item.Detail.Metadata.Label
                    title="Context"
                    text={row.info?.contextSize ? row.info.contextSize.toLocaleString() : "—"}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Trained Context"
                    text={row.info?.trainedContext ? row.info.trainedContext.toLocaleString() : "—"}
                  />
                  <List.Item.Detail.Metadata.Label title="Parameters" text={humanCount(row.info?.params)} />
                  <List.Item.Detail.Metadata.Label title="Weights" text={humanBytes(row.info?.sizeBytes)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Base URL" content={row.endpoint.baseUrl} />
              <Action.OpenInBrowser
                title="Open Health Endpoint"
                url={`${row.endpoint.baseUrl.replace(/\/v1$/, "")}/health`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
