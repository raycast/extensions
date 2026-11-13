import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { endpointCurl, endpointMarkdown, loadIndex, methodColor, slugWords } from "./lib/data";
import type { Endpoint, SecurityHeader, Server } from "./lib/types";

const ALL_TAGS = "__all__";

export default function SearchApi() {
  const index = useMemo(() => loadIndex(), []);
  const [tag, setTag] = useState(ALL_TAGS);
  const [showingDetail, setShowingDetail] = useState(true);

  const tags = useMemo(() => [...new Set(index.endpoints.map((e) => e.tag))].filter(Boolean).sort(), [index]);
  const endpoints = useMemo(
    () => (tag === ALL_TAGS ? index.endpoints : index.endpoints.filter((e) => e.tag === tag)),
    [index, tag],
  );

  const sections = useMemo(() => {
    const grouped = new Map<string, Endpoint[]>();
    for (const endpoint of endpoints) {
      const key = endpoint.tag || "Other";
      const bucket = grouped.get(key);
      if (bucket) bucket.push(endpoint);
      else grouped.set(key, [endpoint]);
    }
    return [...grouped.entries()];
  }, [endpoints]);

  // Production first, so a copied cURL is never accidentally pointed at sandbox.
  const defaultServer = index.servers[0]?.url ?? "https://api.ceypay.io";

  return (
    <List
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search endpoints by name, path, or operation…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by resource" storeValue onChange={setTag}>
          <List.Dropdown.Item title="All Resources" value={ALL_TAGS} />
          {tags.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No matching endpoints"
        description="Try a path fragment like “subscription” or an operation id like “createPayment”."
      />
      {sections.map(([name, items]) => (
        <List.Section key={name} title={name} subtitle={`${items.length}`}>
          {items.map((endpoint) => (
            <EndpointItem
              key={`${endpoint.method} ${endpoint.path}`}
              endpoint={endpoint}
              servers={index.servers}
              defaultServer={defaultServer}
              securityHeaders={index.securityHeaders}
              showingDetail={showingDetail}
              onToggleDetail={() => setShowingDetail((value) => !value)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

type EndpointItemProps = {
  endpoint: Endpoint;
  servers: Server[];
  defaultServer: string;
  securityHeaders: SecurityHeader[];
  showingDetail: boolean;
  onToggleDetail: () => void;
};

function EndpointItem({
  endpoint,
  servers,
  defaultServer,
  securityHeaders,
  showingDetail,
  onToggleDetail,
}: EndpointItemProps) {
  const keywords = useMemo(
    () => [
      ...new Set([
        endpoint.method.toLowerCase(),
        ...slugWords(endpoint.path),
        ...slugWords(endpoint.operationId),
        ...slugWords(endpoint.summary),
        ...slugWords(endpoint.tag),
      ]),
    ],
    [endpoint],
  );

  const bodyLabel =
    endpoint.requestExample !== undefined ? (endpoint.requestRequired ? "Required" : "Optional") : "None";

  return (
    <List.Item
      icon={{ source: Icon.Code, tintColor: methodColor(endpoint.method) }}
      title={endpoint.title}
      subtitle={showingDetail ? undefined : endpoint.path}
      keywords={keywords}
      accessories={[{ tag: { value: endpoint.method, color: methodColor(endpoint.method) } }]}
      detail={
        <List.Item.Detail
          markdown={endpointMarkdown(endpoint)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Method">
                <List.Item.Detail.Metadata.TagList.Item text={endpoint.method} color={methodColor(endpoint.method)} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Path" text={endpoint.path} />
              {endpoint.operationId ? (
                <List.Item.Detail.Metadata.Label title="Operation" text={endpoint.operationId} />
              ) : null}
              <List.Item.Detail.Metadata.Label title="Resource" text={endpoint.tag || "—"} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Parameters"
                text={endpoint.parameters.length ? `${endpoint.parameters.length}` : "None"}
              />
              <List.Item.Detail.Metadata.Label title="Request body" text={bodyLabel} />
              <List.Item.Detail.Metadata.TagList title="Responses">
                {endpoint.responses.map((response) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={response.status}
                    text={response.status}
                    color={response.status.startsWith("2") ? Color.Green : Color.Orange}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* Withheld while the endpoint's docs page is not deployed yet. */}
            {endpoint.docsLive === false ? null : <Action.OpenInBrowser title="Open Docs" url={endpoint.url} />}
            <Action.CopyToClipboard
              title="Copy Path"
              content={endpoint.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action.CopyToClipboard
              title="Copy Full URL"
              content={`${defaultServer}${endpoint.path}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy as cURL">
            {servers.map((server) => (
              <Action.CopyToClipboard
                key={server.url}
                icon={Icon.Terminal}
                title={server.description.split("—")[0].trim()}
                content={endpointCurl(endpoint, server.url, securityHeaders)}
              />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {endpoint.requestExample !== undefined ? (
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title="Copy Request Example"
                content={JSON.stringify(endpoint.requestExample, null, 2)}
              />
            ) : null}
            {endpoint.operationId ? (
              <Action.CopyToClipboard icon={Icon.Hashtag} title="Copy Operation Id" content={endpoint.operationId} />
            ) : null}
            <Action
              icon={Icon.Sidebar}
              title={showingDetail ? "Hide Details" : "Show Details"}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
